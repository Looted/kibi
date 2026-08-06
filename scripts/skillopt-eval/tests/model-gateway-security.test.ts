import { describe, expect, test } from "bun:test";
import {
  FakeProviderSupervisor,
  GatewayPolicyError,
} from "../runtime/fake-provider-supervisor";

const hash = (character: string): string => character.repeat(64);

const fixture = () =>
  new FakeProviderSupervisor({
    parentId: "00000000-0000-4000-8000-000000000502",
    parentHash: hash("2"),
    authorizationMicrousd: 2000,
    maxRequests: 2,
    pricingHash: hash("8"),
    providerKeyId: "provider-supervisor-v1",
    verifierKeyId: "zero-budget-verifier-v1",
    destination: {
      scheme: "https",
      host: "api.openai.example",
      port: 443,
      sni: "api.openai.example",
      pinnedIps: ["192.0.2.44"],
      selectedIp: "192.0.2.44",
      caDigest: hash("a"),
      redirects: false,
      proxies: false,
      tunnels: false,
    },
    ceilings: {
      models: ["gpt-5.4-mini", "gpt-5.6-sol"],
      maxInputTokens: 1000,
      maxOutputTokens: 200,
      maxRetries: 1,
      timeoutMs: 5000,
      maxChargeMicrousd: 1000,
    },
  });

const request = (id = "request-1", model = "gpt-5.4-mini") => ({
  requestId: id,
  requestHash: hash(id.endsWith("1") ? "b" : "c"),
  model,
  leaseId: id.endsWith("1")
    ? "00000000-0000-4000-8000-000000000511"
    : "00000000-0000-4000-8000-000000000512",
  inputTokens: 800,
  maxOutputTokens: 100,
  maxRetries: 1,
  timeoutMs: 4000,
});

describe("trusted broker model gateway security", () => {
  test("rejects forged capability fields", () => {
    const supervisor = fixture();
    const { capability } = supervisor.reserve(request());

    expect(() =>
      supervisor.forward(
        { ...capability, requestId: "request-forged" },
        { kind: "ambiguous" },
      ),
    ).toThrow("capability_forged");
  });

  test("binds approved pricing and rejects price rebinding", () => {
    const supervisor = fixture();
    const { capability } = supervisor.reserve(request());

    expect(capability.pricingHash).toBe(hash("8"));
    expect(() =>
      supervisor.forward(
        { ...capability, pricingHash: hash("9") },
        { kind: "ambiguous" },
      ),
    ).toThrow("capability_forged");
  });

  test("rejects non-integer authorization pricing", () => {
    // Given
    const config = fixture().configuration();

    // When / Then
    expect(
      () =>
        new FakeProviderSupervisor({
          ...config,
          ceilings: { ...config.ceilings, maxChargeMicrousd: 1000.5 },
        }),
    ).toThrow(GatewayPolicyError);
    expect(
      () =>
        new FakeProviderSupervisor({
          ...config,
          authorizationMicrousd: 2000.5,
        }),
    ).toThrow(GatewayPolicyError);
  });

  test("binds the approved model and rejects model rebinding", () => {
    // Given
    const supervisor = fixture();
    const { capability } = supervisor.reserve(request());

    // When / Then
    expect(capability.model).toBe("gpt-5.4-mini");
    expect(() =>
      supervisor.forward(
        { ...capability, model: "gpt-5.6-sol" },
        { kind: "ambiguous" },
      ),
    ).toThrow("capability_forged");
  });

  test("binds the approved lease and rejects lease rebinding", () => {
    // Given
    const supervisor = fixture();
    const { capability } = supervisor.reserve(request());

    // When / Then
    expect(capability.leaseId).toBe("00000000-0000-4000-8000-000000000511");
    expect(() =>
      supervisor.forward(
        {
          ...capability,
          leaseId: "00000000-0000-4000-8000-000000000599",
        },
        { kind: "ambiguous" },
      ),
    ).toThrow("capability_forged");
  });

  test("rejects malformed pinned CA digests", () => {
    const config = fixture().configuration();

    expect(
      () =>
        new FakeProviderSupervisor({
          ...config,
          destination: { ...config.destination, caDigest: "invalid" },
        }),
    ).toThrow(GatewayPolicyError);
  });

  test("rejects TLS and SNI destination mismatches", () => {
    const config = fixture().configuration();

    expect(
      () =>
        new FakeProviderSupervisor({
          ...config,
          destination: { ...config.destination, scheme: "http" },
        }),
    ).toThrow(GatewayPolicyError);
    expect(
      () =>
        new FakeProviderSupervisor({
          ...config,
          destination: { ...config.destination, sni: "wrong.example" },
        }),
    ).toThrow(GatewayPolicyError);
  });

  test("rejects selected IP outside the pinned destination set", () => {
    const config = fixture().configuration();

    expect(
      () =>
        new FakeProviderSupervisor({
          ...config,
          destination: {
            ...config.destination,
            selectedIp: "198.51.100.9",
          },
        }),
    ).toThrow(GatewayPolicyError);
  });

  test("rejects redirect proxy and tunnel egress", () => {
    const config = fixture().configuration();

    for (const field of ["redirects", "proxies", "tunnels"] as const) {
      expect(
        () =>
          new FakeProviderSupervisor({
            ...config,
            destination: { ...config.destination, [field]: true },
          }),
      ).toThrow(GatewayPolicyError);
    }
  });

  test("rejects replayed one-use capabilities", () => {
    const supervisor = fixture();
    const { capability } = supervisor.reserve(request());
    supervisor.forward(capability, { kind: "ambiguous" });

    expect(() => supervisor.forward(capability, { kind: "ambiguous" })).toThrow(
      "capability_replay",
    );
  });

  test("rejects request and invoice ceilings", () => {
    expect(() =>
      fixture().reserve(request("request-1", "unapproved-model")),
    ).toThrow(GatewayPolicyError);
    expect(() =>
      fixture().reserve({ ...request(), inputTokens: 1001 }),
    ).toThrow(GatewayPolicyError);
    expect(() =>
      fixture().reserve({ ...request(), maxOutputTokens: 201 }),
    ).toThrow(GatewayPolicyError);
    expect(() => fixture().reserve({ ...request(), maxRetries: 2 })).toThrow(
      GatewayPolicyError,
    );
    expect(() => fixture().reserve({ ...request(), timeoutMs: 5001 })).toThrow(
      GatewayPolicyError,
    );

    const requestLimited = fixture();
    requestLimited.reserve(request("request-1"));
    requestLimited.reserve(request("request-2"));
    expect(() => requestLimited.reserve(request("request-3"))).toThrow(
      "request_ceiling_exceeded",
    );

    const invoiceLimited = fixture();
    const { capability } = invoiceLimited.reserve(request());
    expect(() =>
      invoiceLimited.forward(capability, {
        kind: "success",
        chargedMicrousd: 1001,
        invoiceId: "invoice-over-ceiling",
      }),
    ).toThrow("invoice_exceeds_authorization");
  });
});
