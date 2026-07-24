import { validateUpsertSpec } from "kibi-cli/operations";
import type { ValidateUpsertPayload } from "kibi-cli/operations/mutation/types";
import type { PrologProcess } from "kibi-cli/prolog";
import type { UpsertArgs } from "./upsert.js";
import { createMutationContext } from "./mutation-context.js";

export type ValidateUpsertResult = Awaited<
  ReturnType<typeof validateUpsertSpec.execute>
> & {
  readonly structuredContent: ValidateUpsertPayload;
};

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
  const args = maybeArgs ?? (isUpsertArgs(prologOrArgs) ? prologOrArgs : null);
  if (args === null) {
    throw new Error("kb_validate_upsert requires an upsert payload");
  }
  const prolog = maybeArgs === undefined || isUpsertArgs(prologOrArgs)
    ? undefined
    : prologOrArgs;
  const result = await validateUpsertSpec.execute(
    args,
    createMutationContext(prolog),
  );
  if (result.structuredContent === undefined) {
    throw new Error("kb_validate_upsert returned no structured content");
  }
  return { ...result, structuredContent: result.structuredContent };
}

export type { ValidateUpsertPayload };
