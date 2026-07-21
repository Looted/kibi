import {
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
  formatRelationshipSourceMismatch,
  validateLiveRelationshipTargets as validateSharedTargets,
} from "kibi-cli/operations/mutation/relationships";
import type { PrologPort } from "kibi-cli/operations/runtime-types";
import type { PrologProcess } from "kibi-cli/prolog";

export {
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
  formatRelationshipSourceMismatch,
};

export async function validateLiveRelationshipTargets(
  prolog: PrologProcess,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly Readonly<Record<string, unknown>>[],
): Promise<void> {
  const port: PrologPort = {
    query: (goal) => prolog.query(goal),
    nextSolution: async () => null,
    invalidateCache: () => prolog.invalidateCache(),
    save: () => prolog.query("kb_save"),
  };
  await validateSharedTargets(port, entity, relationships);
}
