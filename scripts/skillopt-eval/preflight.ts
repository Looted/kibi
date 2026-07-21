import { spawnSync } from "node:child_process";

// implements REQ-skill-behavioral-efficacy
const SKILLOPT_COMMIT = "b860a5cf88ce75e2bd02ca981ac21fb28cffba83" as const;

const HOST_COMMANDS = {
  codex: "codex",
  opencode: "opencode",
  cursor: "cursor-agent",
} as const;

const HOSTS = ["codex", "opencode", "cursor"] as const;

// implements REQ-skill-behavioral-efficacy
type PreflightHost = keyof typeof HOST_COMMANDS;

// implements REQ-skill-behavioral-efficacy
type PreflightDependencies = Readonly<{
  commandExists: (command: string) => boolean;
  commandVersion: (command: string) => string;
}>;

// implements REQ-skill-behavioral-efficacy
type PreflightConfig = Readonly<{
  runId: string;
  targetModel: string;
  optimizerModel: string;
  modelAccess: boolean;
}>;

// implements REQ-skill-behavioral-efficacy
type HostPreflight = Readonly<{
  host: PreflightHost;
  command: string;
  version: string;
}>;

// implements REQ-skill-behavioral-efficacy
type PreflightPass = Readonly<{
  verdict: "pass";
  runId: string;
  targetModel: string;
  optimizerModel: string;
  skilloptCommit: typeof SKILLOPT_COMMIT;
  hosts: readonly HostPreflight[];
  paidModelCalls: 0;
}>;

// implements REQ-skill-behavioral-efficacy
type PreflightNoGo = Readonly<{
  verdict: "no-go";
  runId: string;
  targetModel: string;
  optimizerModel: string;
  skilloptCommit: typeof SKILLOPT_COMMIT;
  hosts: readonly HostPreflight[];
  reason: string;
}>;

// implements REQ-skill-behavioral-efficacy
type PreflightReceipt = PreflightPass | PreflightNoGo;

const runtimeDependencies: PreflightDependencies = {
  commandExists: (command) =>
    spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0,
  commandVersion: (command) => {
    const result = spawnSync(command, ["--version"], { encoding: "utf8" });
    return result.stdout.trim();
  },
};

function hostChecks(
  dependencies: PreflightDependencies,
): readonly HostPreflight[] {
  const checks: HostPreflight[] = [];
  for (const host of HOSTS) {
    const command = HOST_COMMANDS[host];
    if (!dependencies.commandExists(command)) {
      return checks;
    }
    checks.push({
      host,
      command,
      version: dependencies.commandVersion(command),
    });
  }
  return checks;
}

function receiptBase(
  config: PreflightConfig,
  hosts: readonly HostPreflight[],
): Readonly<{
  runId: string;
  targetModel: string;
  optimizerModel: string;
  skilloptCommit: typeof SKILLOPT_COMMIT;
  hosts: readonly HostPreflight[];
  paidModelCalls: 0;
}> {
  return {
    runId: config.runId,
    targetModel: config.targetModel,
    optimizerModel: config.optimizerModel,
    skilloptCommit: SKILLOPT_COMMIT,
    hosts,
    paidModelCalls: 0,
  };
}

// implements REQ-skill-behavioral-efficacy
export function runPreflight(
  config: PreflightConfig,
  dependencies: PreflightDependencies = runtimeDependencies,
): PreflightReceipt {
  const hosts = hostChecks(dependencies);
  if (hosts.length !== HOSTS.length) {
    const missingHost = HOSTS[hosts.length];
    return {
      ...receiptBase(config, hosts),
      verdict: "no-go",
      reason: `missing_host:${missingHost}`,
    };
  }
  if (!dependencies.commandExists("bwrap")) {
    return {
      ...receiptBase(config, hosts),
      verdict: "no-go",
      reason: "missing_isolation:bwrap",
    };
  }
  if (config.targetModel !== "gpt-5.4-mini") {
    return {
      ...receiptBase(config, hosts),
      verdict: "no-go",
      reason: `target_model_mismatch:${config.targetModel}`,
    };
  }
  if (config.optimizerModel !== "gpt-5.5") {
    return {
      ...receiptBase(config, hosts),
      verdict: "no-go",
      reason: `optimizer_model_mismatch:${config.optimizerModel}`,
    };
  }
  if (!config.modelAccess) {
    return {
      ...receiptBase(config, hosts),
      verdict: "no-go",
      reason: "model_access_not_verified",
    };
  }
  return { ...receiptBase(config, hosts), verdict: "pass" };
}
