import { createHash } from "node:crypto";
import { z } from "zod";
import {
  type Capability,
  CapabilitySchema,
  type Configuration,
  ConfigurationSchema,
  type DebitReceipt,
  type Outcome,
  OutcomeSchema,
  type Request,
  RequestSchema,
  type Reservation,
} from "./fake-provider-contracts";

export class GatewayPolicyError extends Error {
  readonly name = "GatewayPolicyError";
}

export class FakeProviderSupervisor {
  // implements REQ-skillopt-predicate-first-requirements
  private readonly config: Configuration;
  // implements REQ-skillopt-predicate-first-requirements
  private readonly capabilities = new Map<string, Capability>();
  // implements REQ-skillopt-predicate-first-requirements
  private readonly requests = new Map<string, Request>();
  // implements REQ-skillopt-predicate-first-requirements
  private readonly receipts = new Map<string, DebitReceipt>();

  constructor(configuration: unknown) {
    try {
      this.config = ConfigurationSchema.parse(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new GatewayPolicyError("gateway_configuration_rejected");
      }
      throw error;
    }
  }

  configuration(): Configuration {
    return this.config;
  }

  reserve(value: unknown): Reservation {
    const request = this.parseRequest(value);
    const existing = this.receipts.get(request.requestId);
    if (existing !== undefined) {
      return { capability: this.capability(request), receipt: existing };
    }
    const known = this.requests.get(request.requestId);
    if (known !== undefined && known.requestHash !== request.requestHash) {
      throw new GatewayPolicyError("request_idempotency_mismatch");
    }
    if (known === undefined && this.requests.size >= this.config.maxRequests) {
      throw new GatewayPolicyError("request_ceiling_exceeded");
    }
    if (
      (this.requests.size + 1) * this.config.ceilings.maxChargeMicrousd >
      this.config.authorizationMicrousd
    ) {
      throw new GatewayPolicyError("authorization_budget_exceeded");
    }
    this.requests.set(request.requestId, request);
    const capability = this.capability(request);
    this.capabilities.set(capability.capabilityId, capability);
    return { capability };
  }

  forward(value: unknown, outcomeValue: unknown): DebitReceipt {
    const capability = this.parseCapability(value);
    const stored = this.capabilities.get(capability.capabilityId);
    if (stored === undefined) throw new GatewayPolicyError("capability_replay");
    if (JSON.stringify(stored) !== JSON.stringify(capability)) {
      throw new GatewayPolicyError("capability_forged");
    }
    const request = [...this.requests.values()].find(
      (candidate) => candidate.requestHash === capability.requestHash,
    );
    if (request === undefined)
      throw new GatewayPolicyError("capability_forged");
    const receipt = this.receiptFor(request, this.parseOutcome(outcomeValue));
    this.capabilities.delete(capability.capabilityId);
    this.receipts.set(request.requestId, receipt);
    return receipt;
  }

  executeWithCrash(
    value: unknown,
    _stage: "reserve" | "forward" | "finalize",
  ): DebitReceipt {
    const request = this.parseRequest(value);
    this.reserve(request);
    const receipt = this.maxChargeReceipt(request, "retained-after-crash");
    this.capabilities.delete(this.capability(request).capabilityId);
    this.receipts.set(request.requestId, receipt);
    return receipt;
  }

  recover(requestId: string): DebitReceipt | undefined {
    return this.receipts.get(requestId);
  }

  reconcile() {
    const receipts = [...this.receipts.values()];
    const chargedMicrousd = receipts.reduce(
      (total, receipt) => total + receipt.authorization.chargedMicrousd,
      0,
    );
    return {
      authorizedMicrousd: this.config.authorizationMicrousd,
      chargedMicrousd,
      releasedMicrousd:
        receipts.length * this.config.ceilings.maxChargeMicrousd -
        chargedMicrousd,
      subentries: receipts.length,
    };
  }

  zeroBudgetVerificationParent() {
    return {
      parentId: this.config.parentId,
      authorizationMicrousd: 0 as const,
      verifierKeyId: this.config.verifierKeyId,
    };
  }

  // implements REQ-skillopt-predicate-first-requirements
  private parseRequest(value: unknown): Request {
    try {
      const request = RequestSchema.parse(value);
      const ceilings = this.config.ceilings;
      if (
        !ceilings.models.includes(request.model) ||
        request.inputTokens > ceilings.maxInputTokens ||
        request.maxOutputTokens > ceilings.maxOutputTokens ||
        request.maxRetries > ceilings.maxRetries ||
        request.timeoutMs > ceilings.timeoutMs
      ) {
        throw new GatewayPolicyError("request_ceiling_exceeded");
      }
      return request;
    } catch (error) {
      if (error instanceof GatewayPolicyError) throw error;
      if (error instanceof z.ZodError) {
        throw new GatewayPolicyError("gateway_request_rejected");
      }
      throw error;
    }
  }

  // implements REQ-skillopt-predicate-first-requirements
  private parseCapability(value: unknown): Capability {
    try {
      return CapabilitySchema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new GatewayPolicyError("capability_forged");
      }
      throw error;
    }
  }

  // implements REQ-skillopt-predicate-first-requirements
  private parseOutcome(value: unknown): Outcome {
    try {
      return OutcomeSchema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new GatewayPolicyError("provider_outcome_rejected");
      }
      throw error;
    }
  }

  // implements REQ-skillopt-predicate-first-requirements
  private capability(request: Request): Capability {
    return {
      capabilityId: createHash("sha256")
        .update(
          `${this.config.parentHash}:${request.requestId}:${request.requestHash}`,
        )
        .digest("hex"),
      parentHash: this.config.parentHash,
      requestHash: request.requestHash,
      sealed: true,
      oneUse: true,
    };
  }

  // implements REQ-skillopt-predicate-first-requirements
  private maxChargeReceipt(
    request: Request,
    status: DebitReceipt["status"],
  ): DebitReceipt {
    const chargedMicrousd = this.config.ceilings.maxChargeMicrousd;
    return {
      requestId: request.requestId,
      status,
      authorization: {
        reservedMicrousd: chargedMicrousd,
        chargedMicrousd,
        releasedMicrousd: 0,
      },
      invoice: null,
    };
  }

  // implements REQ-skillopt-predicate-first-requirements
  private receiptFor(request: Request, outcome: Outcome): DebitReceipt {
    if (outcome.kind === "ambiguous") {
      return this.maxChargeReceipt(request, "ambiguous-max-charged");
    }
    const maximum = this.config.ceilings.maxChargeMicrousd;
    if (outcome.chargedMicrousd > maximum) {
      throw new GatewayPolicyError("invoice_exceeds_authorization");
    }
    return {
      requestId: request.requestId,
      status: "finalized",
      authorization: {
        reservedMicrousd: maximum,
        chargedMicrousd: outcome.chargedMicrousd,
        releasedMicrousd: maximum - outcome.chargedMicrousd,
      },
      invoice: {
        invoiceId: outcome.invoiceId,
        amountMicrousd: outcome.chargedMicrousd,
      },
      ...(outcome.providerOutput === undefined
        ? {}
        : { providerOutput: outcome.providerOutput }),
    };
  }
}
