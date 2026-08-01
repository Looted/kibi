import { JsonValueSchema, canonicalJson } from "./contracts/common";
import { runBridge } from "./runtime/bridge-cli-execution";
import {
  bridgeErrorCode,
  parseBridgeOptions,
} from "./runtime/bridge-cli-options";
import {
  BridgeRequestSchema,
  bindBridgeResult,
  readBridgeRequest,
  writeBridgeResult,
} from "./runtime/file-bridge";

type BridgePipe = Readonly<{
  readRequest: () => Promise<unknown>;
  writeResult: (result: unknown) => Promise<void>;
}>;

const defaultPipe: BridgePipe = {
  readRequest: async () => {
    let text = "";
    for await (const chunk of process.stdin) text += chunk.toString();
    return JSON.parse(text);
  },
  writeResult: async (result) => {
    process.stdout.write(`${canonicalJson(JsonValueSchema.parse(result))}\n`);
  },
};

// implements REQ-skillopt-codex-optimization
export async function bridgeMain(
  args: readonly string[],
  dependencies?: Parameters<typeof runBridge>[2],
  pipe: BridgePipe = defaultPipe,
): Promise<number> {
  const options = parseBridgeOptions(args);
  const request = options.pipe
    ? BridgeRequestSchema.parse(await pipe.readRequest())
    : await readBridgeRequest(options.requestPath ?? "");
  const result = await runBridge(options, request, dependencies);
  if (options.pipe) {
    await pipe.writeResult(bindBridgeResult(result, request));
  } else {
    await writeBridgeResult(options.resultPath ?? "", result, request);
  }
  return 0;
}

if (import.meta.main) {
  bridgeMain(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      const cause =
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : undefined;
      process.stderr.write(
        `${JSON.stringify({
          code: bridgeErrorCode(error),
          message: error instanceof Error ? error.message : String(error),
          ...(cause === undefined ? {} : { cause }),
        })}\n`,
      );
      process.exitCode = 1;
    },
  );
}
