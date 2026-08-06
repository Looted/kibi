import { resolve } from "node:path";
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";
import { CodexAuthError } from "./codex-auth";
import { FixtureIntegrityError } from "./codex-cell-runner";
import { ProcessControlError } from "./process";

type BridgeOptions = Readonly<{
  pipe: boolean;
  requestPath?: string;
  resultPath?: string;
  fake: boolean;
  sourceWorktree?: string;
  artifactRoot?: string;
  fixtureRunRoot?: string;
  codexExecutable?: string;
  bwrapExecutable?: string;
  timeoutMs: number;
  pricingHash: string;
  priceAmount: number;
  hiddenMarkers: readonly string[];
}>;

type BridgeFailureKind =
  | "authentication"
  | "fixture_integrity"
  | "timeout"
  | "execution";

class BridgeCliInputError extends Error {
  readonly name = "BridgeCliInputError";

  constructor(readonly code: string) {
    super(code);
  }
}

class BridgeExecutionError extends Error {
  readonly name = "BridgeExecutionError";

  constructor(
    readonly kind: BridgeFailureKind,
    options?: ErrorOptions,
  ) {
    super(`bridge_${kind}_failed`, options);
  }
}

function requiredValue(value: string | undefined, option: string): string {
  if (value === undefined || value.length === 0 || value.startsWith("--")) {
    throw new BridgeCliInputError(`missing_${option.slice(2)}`);
  }
  return value;
}

function parsePositiveNumber(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BridgeCliInputError(`invalid_${option.slice(2)}`);
  }
  return parsed;
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = parsePositiveNumber(value, option);
  if (!Number.isInteger(parsed) || parsed === 0) {
    throw new BridgeCliInputError(`invalid_${option.slice(2)}`);
  }
  return parsed;
}

export function parseBridgeOptions(args: readonly string[]): BridgeOptions {
  let requestPath: string | undefined;
  let resultPath: string | undefined;
  let sourceWorktree: string | undefined;
  let artifactRoot: string | undefined;
  let fixtureRunRoot: string | undefined;
  let codexExecutable: string | undefined;
  let bwrapExecutable: string | undefined;
  let timeoutMs = 180_000;
  let pricingHash = "0".repeat(64);
  let priceAmount = 0;
  let fake = false;
  let pipe = false;
  const hiddenMarkers: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--fake") {
      fake = true;
      continue;
    }
    if (option === "--pipe") {
      pipe = true;
      continue;
    }
    if (option === "--hidden-marker") {
      hiddenMarkers.push(requiredValue(args[index + 1], option));
      index += 1;
      continue;
    }
    const value = requiredValue(args[index + 1], option ?? "--unknown");
    if (option === "--request") requestPath = resolve(value);
    else if (option === "--result") resultPath = resolve(value);
    else if (option === "--source-worktree") sourceWorktree = resolve(value);
    else if (option === "--artifact-root") artifactRoot = resolve(value);
    else if (option === "--fixture-run-root") fixtureRunRoot = resolve(value);
    else if (option === "--codex-executable") codexExecutable = resolve(value);
    else if (option === "--bwrap-executable") bwrapExecutable = resolve(value);
    else if (option === "--timeout-ms")
      timeoutMs = parsePositiveInteger(value, option);
    else if (option === "--pricing-hash") pricingHash = value;
    else if (option === "--price-amount")
      priceAmount = parsePositiveNumber(value, option);
    else
      throw new BridgeCliInputError(`unknown_${option?.slice(2) ?? "option"}`);
    index += 1;
  }

  if (pipe && (requestPath !== undefined || resultPath !== undefined))
    throw new BridgeCliInputError("pipe_with_paths");
  if (!pipe && requestPath === undefined)
    throw new BridgeCliInputError("missing_request");
  if (!pipe && resultPath === undefined)
    throw new BridgeCliInputError("missing_result");
  if (
    !fake &&
    (sourceWorktree === undefined ||
      artifactRoot === undefined ||
      fixtureRunRoot === undefined ||
      codexExecutable === undefined ||
      bwrapExecutable === undefined)
  ) {
    throw new BridgeCliInputError("missing_real_execution_options");
  }
  return {
    pipe,
    requestPath,
    resultPath,
    fake,
    sourceWorktree,
    artifactRoot,
    fixtureRunRoot,
    codexExecutable,
    bwrapExecutable,
    timeoutMs,
    pricingHash,
    priceAmount,
    hiddenMarkers,
  };
}

// implements REQ-skillopt-codex-optimization
export function bridgeFailure(error: unknown): BridgeExecutionError {
  if (error instanceof CodexAuthError) {
    return new BridgeExecutionError("authentication", { cause: error });
  }
  if (error instanceof FixtureIntegrityError) {
    return new BridgeExecutionError("fixture_integrity", { cause: error });
  }
  if (error instanceof ProcessControlError && error.kind === "timeout") {
    return new BridgeExecutionError("timeout", { cause: error });
  }
  return new BridgeExecutionError("execution", {
    cause: error instanceof Error ? error : undefined,
  });
}

export function bridgeErrorCode(error: unknown): string {
  if (error instanceof EvaluationInfrastructureError)
    return "BRIDGE_CELL_INFRASTRUCTURE_FAILED";
  if (error instanceof BridgeCliInputError) return "BRIDGE_INPUT_INVALID";
  if (error instanceof BridgeExecutionError) {
    return `BRIDGE_${error.kind.toUpperCase()}_FAILED`;
  }
  return "BRIDGE_EXECUTION_FAILED";
}
