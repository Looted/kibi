import { upsertSpec } from "kibi-cli/operations";
import { setSymbolRefreshForTests } from "kibi-cli/operations/mutation/symbol-refresh";
import type {
  UpsertInput,
  UpsertPayload,
  ValidatedUpsert,
} from "kibi-cli/operations/mutation/types";
import { validateUpsertInput } from "kibi-cli/operations/mutation/validation";
import type { PrologProcess } from "kibi-cli/prolog";
import { isMcpDebugEnabled } from "../env.js";
import { createMutationContext } from "./mutation-context.js";
import type { refreshCoordinatesForSymbolId } from "./symbols.js";

export interface UpsertArgs extends UpsertInput {}
export type UpsertResult = Awaited<ReturnType<typeof upsertSpec.execute>>;
export interface ValidatedUpsertArgs extends ValidatedUpsert {}

export async function handleKbUpsert(
  prolog: PrologProcess,
  args: UpsertArgs,
): Promise<UpsertResult> {
  return upsertSpec.execute(args, createMutationContext(prolog));
}

export function validateKbUpsertArgs(args: UpsertArgs): ValidatedUpsertArgs {
  return validateUpsertInput(args, new Date());
}

export const __test__ = {
  setRefreshCoordinatesForSymbolIdForTests(
    refresh: typeof refreshCoordinatesForSymbolId | undefined,
  ): void {
    setSymbolRefreshForTests(
      refresh === undefined
        ? undefined
        : async (symbolId) => {
            try {
              return await refresh(symbolId);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              if (isMcpDebugEnabled()) {
                console.warn(
                  `[KIBI-MCP] Symbol coordinate auto-refresh failed for ${symbolId}: ${message}`,
                );
              }
              return { refreshed: false, found: false };
            }
          },
    );
  },
};

export type { UpsertPayload };
