import { runBridge } from "./runtime/bridge-cli-execution";
import {
  bridgeErrorCode,
  parseBridgeOptions,
} from "./runtime/bridge-cli-options";
import { readBridgeRequest, writeBridgeResult } from "./runtime/file-bridge";

// implements REQ-skillopt-codex-optimization
export async function bridgeMain(
  args: readonly string[],
  dependencies?: Parameters<typeof runBridge>[2],
): Promise<number> {
  const options = parseBridgeOptions(args);
  const request = await readBridgeRequest(options.requestPath);
  const result = await runBridge(options, request, dependencies);
  await writeBridgeResult(options.resultPath, result, request);
  return 0;
}

if (import.meta.main) {
  bridgeMain(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(
        `${JSON.stringify({ code: bridgeErrorCode(error) })}\n`,
      );
      process.exitCode = 1;
    },
  );
}
