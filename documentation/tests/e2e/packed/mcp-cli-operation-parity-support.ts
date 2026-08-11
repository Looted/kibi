// implements REQ-kibi-operation-interface-parity
import { type ChildProcess, spawn } from "node:child_process";
import { type Server, createServer } from "node:http";
import type { TestSandbox } from "./helpers.js";
import type { JsonRecord } from "./mcp-cli-operation-parity-fixtures.js";

export type JsonRpcResponse = {
  readonly id?: number;
  readonly result?: JsonRecord;
  readonly error?: JsonRecord;
};

export function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]),
  );
}

export function canonicalSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalSchema);
  if (value === null || typeof value !== "object") return value;
  const record = value as JsonRecord;
  const variants = Array.isArray(record.anyOf) ? record.anyOf : [];
  const constants = variants.flatMap((variant) => {
    if (variant === null || typeof variant !== "object") return [];
    const constant = (variant as JsonRecord).const;
    return typeof constant === "string" ? [constant] : [];
  });
  const normalized = Object.fromEntries(
    Object.entries(record)
      .filter(([key, entry]) => {
        if (
          ["$schema", "additionalProperties", "default", "execution"].includes(
            key,
          )
        ) {
          return false;
        }
        if (
          key === "properties" &&
          entry !== null &&
          typeof entry === "object" &&
          Object.keys(entry).length === 0
        ) {
          return false;
        }
        if (
          (key === "minimum" || key === "maximum") &&
          (entry === Number.MIN_SAFE_INTEGER ||
            entry === Number.MAX_SAFE_INTEGER)
        ) {
          return false;
        }
        return key !== "anyOf" && key !== "const";
      })
      .map(([key, entry]) => [key, canonicalSchema(entry)]),
  );
  if (constants.length === variants.length && constants.length > 0) {
    normalized.type = "string";
    normalized.enum = constants;
  } else if (typeof record.const === "string") {
    normalized.type = "string";
    normalized.enum = [record.const];
  }
  return normalized;
}

export function startSparqlServer(): Promise<{
  readonly server: Server;
  readonly endpoint: string;
}> {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "application/sparql-results+json",
    });
    response.end(
      JSON.stringify({
        results: {
          bindings: [
            {
              subject: { type: "literal", value: "REQ-PACKED-PARITY" },
            },
          ],
        },
      }),
    );
  });
  return new Promise((resolveStart) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("SPARQL server did not bind a TCP port");
      }
      resolveStart({
        server,
        endpoint: `http://127.0.0.1:${address.port}/sparql`,
      });
    });
  });
}

export function runStdinRoute(
  sandbox: TestSandbox,
  route: string,
  input: JsonRecord,
) {
  return new Promise<{
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
  }>((resolveRun, rejectRun) => {
    const child = spawn("node", [sandbox.kibiBin, route, "--input", "-"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectRun);
    child.on("close", (code) =>
      resolveRun({ stdout, stderr, exitCode: code ?? 0 }),
    );
    child.stdin.end(JSON.stringify(input));
  });
}

export function sendMcpRequest(
  process: ChildProcess,
  id: number,
  method: string,
  params?: JsonRecord,
): Promise<JsonRpcResponse> {
  return new Promise((resolveRequest, rejectRequest) => {
    let buffered = "";
    const timeout = setTimeout(
      () => rejectRequest(new Error(`Timed out waiting for ${method}`)),
      30_000,
    );
    const onData = (chunk: Buffer) => {
      buffered += chunk.toString();
      for (const line of buffered.split("\n")) {
        if (!line.trim()) continue;
        const response = JSON.parse(line) as JsonRpcResponse;
        if (response.id === id) {
          clearTimeout(timeout);
          process.stdout?.off("data", onData);
          resolveRequest(response);
          return;
        }
      }
    };
    process.stdout?.on("data", onData);
    process.stdin?.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        ...(params ? { params } : {}),
      })}\n`,
    );
  });
}

export function startMcpServer(
  sandbox: TestSandbox,
  args: readonly string[] = [],
): ChildProcess {
  return spawn("node", [sandbox.kibiMcpBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
}
