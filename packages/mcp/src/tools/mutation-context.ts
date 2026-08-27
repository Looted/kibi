import * as fs from "node:fs/promises";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
} from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { resolveWorkspaceRoot } from "../workspace.js";

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
    // The thin direct handler remains a compiled-KB compatibility surface.
    // Production MCP registration supplies sourceFirst through the shared
    // operation runtime while this adapter still exposes filesystem reads for
    // symbol-granularity validation.
    sourceFirst: false,
    ...(process.env.KIBI_WORKSPACE !== undefined ? { fs: filesystem } : {}),
    ...(port === undefined ? {} : { prolog: port }),
  };
}

const filesystem: FilesystemPort = {
  readFile: (filePath) => fs.readFile(filePath, "utf8"),
  writeFile: (filePath, data) => fs.writeFile(filePath, data, "utf8"),
  mkdir: async (directoryPath) => {
    await fs.mkdir(directoryPath, { recursive: true });
  },
  stat: (filePath) => fs.stat(filePath),
  unlink: (filePath) => fs.unlink(filePath),
};
