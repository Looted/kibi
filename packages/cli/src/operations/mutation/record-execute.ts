import { InputError, OperationError } from "../../cli-errors.js";
import { prepareOperationInput } from "../../cli-validate.js";
import type { ChangedCheckContent } from "../../public/operations/changed-check.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { checkSpec } from "../../public/operations/specs/check.js";
import { upsertSpec } from "../../public/operations/specs/upsert.js";
import type { OperationResult } from "../../public/operations/types.js";
import { prologCaptureReads } from "./capture.js";
import {
  type RecordInput,
  assertRecordFields,
  freeRecordId,
  recordUpsertPayload,
} from "./record.js";
import type { UpsertInput, UpsertPayload } from "./types.js";

/** What kb_record returns: its kb_upsert payload, the write and the verdict. */
export type RecordPayload = Readonly<{
  id: string;
  /** The one kb_upsert payload this call stands for. */
  upsert: UpsertInput;
  /** kb_upsert's committed result. */
  written?: UpsertPayload;
  /** kb_check changed:true over the recorded code. */
  verdict?: ChangedCheckContent;
  commitAllowed?: boolean;
  status?: string;
  nextActions?: readonly unknown[];
  /** dryRun only: kb_upsert's dry-run result for the payload. */
  dryRun?: true;
  preview?: Readonly<Record<string, unknown>>;
  valid?: boolean;
  errors?: readonly unknown[];
  skippedEffects?: readonly string[];
}>;

type Execute<I, O> = (
  input: I,
  context: OperationContext,
) => Promise<OperationResult<O>>;

/** The operations kb_record composes, replaceable in tests. */
export type RecordDeps = Readonly<{
  exists: (context: OperationContext) => (id: string) => Promise<boolean>;
  upsert: Execute<UpsertInput, UpsertPayload>;
  check: Execute<Readonly<Record<string, unknown>>, ChangedCheckContent>;
}>;

export const RECORD_DEPS: RecordDeps = {
  // kb_record requires Prolog, so the operation runtime always supplies it.
  exists: (context) => prologCaptureReads(context.prolog as PrologPort).exists,
  upsert: upsertSpec.execute,
  check: checkSpec.execute as unknown as RecordDeps["check"],
};

/**
 * The payload through the same schema validation kb_upsert's own CLI and
 * MCP routes apply before they run it.
 */
function validatedUpsert(payload: UpsertInput): UpsertInput {
  const prepared = prepareOperationInput(
    payload,
    upsertSpec.businessInputSchema,
  );
  if (!prepared.valid)
    throw new InputError(
      "VALIDATION_FAILED",
      `kb_upsert refuses the payload kb_record built from this input: ${prepared.errors.join("; ")}`,
    );
  return prepared.businessInput as UpsertInput;
}

function texts(result: OperationResult): string[] {
  return result.content
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string");
}

/**
 * kb_record: translate the input into one kb_upsert payload and run it
 * through kb_upsert; a committed write is then judged by kb_check
 * changed:true over the recorded code. dryRun:true returns the payload and
 * kb_upsert's dry run of it, and writes nothing.
 */
export async function executeRecord(
  input: RecordInput,
  context: OperationContext,
  deps: RecordDeps = RECORD_DEPS,
): Promise<OperationResult<RecordPayload>> {
  assertRecordFields(input);
  const id = await freeRecordId(input.statement, deps.exists(context));
  const payload = recordUpsertPayload(input, id);
  const upsertInput = validatedUpsert(
    input.dryRun === true ? { ...payload, dryRun: true } : payload,
  );
  const result = await deps.upsert(upsertInput, context);
  const written = result.structuredContent as UpsertPayload;
  if (input.dryRun === true) {
    const preview = written as unknown as Record<string, unknown>;
    return {
      content: [
        {
          type: "text",
          text: `kb_record ${id} is this kb_upsert payload: ${JSON.stringify(payload)}`,
        },
        ...result.content,
      ],
      structuredContent: {
        id,
        upsert: payload,
        dryRun: true,
        preview,
        valid: preview.valid !== false,
        ...(Array.isArray(preview.errors) ? { errors: preview.errors } : {}),
        skippedEffects: ["kb-write", "workspace-write"],
      },
    };
  }
  const files = [...new Set(input.code.map((entry) => entry.file))];
  let verdict: OperationResult<ChangedCheckContent>;
  try {
    verdict = await deps.check({ changed: true, sourceFiles: files }, context);
  } catch (error) {
    throw new OperationError(
      "RECORD_VERDICT_FAILED",
      `${id} was written by kb_upsert; kb_check changed:true failed after it: ${error instanceof Error ? error.message : String(error)}. Run kb_check with changed:true for ${files.join(", ")} to get the verdict.`,
      true,
    );
  }
  const gate = verdict.structuredContent as ChangedCheckContent;
  return {
    content: [
      { type: "text", text: `Recorded ${id} through kb_upsert.` },
      ...result.content,
      { type: "text", text: texts(verdict).join("\n") },
    ],
    structuredContent: {
      id,
      upsert: payload,
      written,
      verdict: gate,
      commitAllowed: gate.commitAllowed,
      ...(written.status !== undefined ? { status: written.status } : {}),
      nextActions: written.nextActions ?? [],
    },
  };
}
