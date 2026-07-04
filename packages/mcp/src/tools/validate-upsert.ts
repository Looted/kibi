import type { PrologProcess } from "kibi-cli/prolog";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";
import { validateLiveRelationshipTargets } from "./relationship-validation.js";
import type { UpsertArgs } from "./upsert.js";
import { validateKbUpsertArgs } from "./upsert.js";

export interface ValidateUpsertResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    semanticAdvisor: SemanticAdvisorReceipt | null;
    normalizedPreview: Record<string, unknown> | null;
  };
}

function isUpsertArgs(value: PrologProcess | UpsertArgs): value is UpsertArgs {
  return "type" in value && "id" in value && "properties" in value;
}

export async function handleKbValidateUpsert(
  args: UpsertArgs,
): Promise<ValidateUpsertResult>;
export async function handleKbValidateUpsert(
  prolog: PrologProcess,
  args: UpsertArgs,
): Promise<ValidateUpsertResult>;
export async function handleKbValidateUpsert(
  prologOrArgs: PrologProcess | UpsertArgs,
  maybeArgs?: UpsertArgs,
): Promise<ValidateUpsertResult> {
  try {
    const args =
      maybeArgs ?? (isUpsertArgs(prologOrArgs) ? prologOrArgs : null);
    if (args === null) {
      throw new Error("kb_validate_upsert requires an upsert payload");
    }
    const prolog = maybeArgs === undefined ? null : prologOrArgs;
    const { entity } = validateKbUpsertArgs(args);
    if (prolog !== null && !isUpsertArgs(prolog)) {
      await validateLiveRelationshipTargets(
        prolog,
        entity,
        args.relationships ?? [],
      );
    }
    const semanticAdvisor = analyzeSemanticAdvisorInput({
      payload: { ...args },
    });
    return {
      content: [
        {
          type: "text",
          text: "kb_validate_upsert: payload is valid for kb_upsert preflight checks. No mutation was performed.",
        },
      ],
      structuredContent: {
        valid: true,
        errors: [],
        warnings: semanticAdvisor.warnings,
        semanticAdvisor: semanticAdvisor.receipt,
        normalizedPreview: entity,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `kb_validate_upsert: payload is invalid. ${message}`,
        },
      ],
      structuredContent: {
        valid: false,
        errors: [message],
        warnings: [],
        semanticAdvisor: null,
        normalizedPreview: null,
      },
    };
  }
}
