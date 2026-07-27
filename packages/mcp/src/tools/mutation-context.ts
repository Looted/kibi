import * as fs from "node:fs/promises";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
} from "kibi-cli/operations/runtime-types";
import type { PrologProcess } from "kibi-cli/prolog";
import { resolveWorkspaceRoot } from "../workspace.js";

const filesystem: FilesystemPort = {
  readFile: (filePath) => fs.readFile(filePath, "utf8"),
  writeFile: (filePath, data) => fs.writeFile(filePath, data, "utf8"),
  mkdir: async (directoryPath) => {
    await fs.mkdir(directoryPath, { recursive: true });
  },
  stat: (filePath) => fs.stat(filePath),
};

// implements REQ-kibi-operation-interface-parity
export function createMutationContext(
  prolog?: PrologProcess,
): OperationContext {
  const port: PrologPort | undefined =
    prolog === undefined
      ? undefined
      : {
          query: (goal) => prolog.query(goal),
          nextSolution: async () => null,
          invalidateCache: () => prolog.invalidateCache(),
          save: () => prolog.query("kb_save"),
        };
  return {
    workspaceRoot: resolveWorkspaceRoot(),
    signal: new AbortController().signal,
    clock: () => new Date(),
    fs: filesystem,
    ...(port === undefined ? {} : { prolog: port }),
  };
}
