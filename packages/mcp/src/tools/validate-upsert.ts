import type { UpsertArgs } from "./upsert.js";
import { validateKbUpsertArgs } from "./upsert.js";

export interface ValidateUpsertResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    normalizedPreview: Record<string, unknown> | null;
  };
}

export async function handleKbValidateUpsert(
  args: UpsertArgs,
): Promise<ValidateUpsertResult> {
  try {
    const { entity } = validateKbUpsertArgs(args);
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
        warnings: [],
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
        normalizedPreview: null,
      },
    };
  }
}
