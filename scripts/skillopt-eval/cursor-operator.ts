import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { runCursorQualification } from "./cursor/qualify";
import {
  persistCursorCompatibilityReport,
  runCursorCompatibilityGate,
} from "./cursor/suite";
import { resolveOperatorBase } from "./operator";

type Command = "qualify" | "compat";

export type ParsedCursorArgs = Readonly<{
  command: Command;
  skill: CanonicalSkill;
  phase: "development" | "held-out";
  cursorExecutable: string;
  candidatePath?: string;
  oneShotPath?: string;
  fixtureRunRoot?: string;
  artifactRoot?: string;
  runId: string;
}>;

export class CursorUsageError extends Error {
  readonly name = "CursorUsageError";
}

// implements REQ-skillopt-cursor-compat
export function parseCursorArgs(args: readonly string[]): ParsedCursorArgs {
  const command = args[0];
  if (command !== "qualify" && command !== "compat") {
    throw new CursorUsageError(
      "Usage: bun run scripts/skillopt-eval/cursor-operator.ts <qualify|compat> [--skill kibi-usage|kibi-freshness|kibi-traceability|kibi-bootstrap] [--phase development|held-out] [--candidate PATH] [--one-shot PATH] [--fixture-run-root PATH] [--artifact-root PATH] [--run-id ID]",
    );
  }
  let skill: CanonicalSkill = "kibi-usage";
  let phase: "development" | "held-out" = "development";
  let cursorExecutable = Bun.which("cursor-agent") ?? "cursor-agent";
  let candidatePath: string | undefined;
  let oneShotPath: string | undefined;
  let fixtureRunRoot: string | undefined;
  let artifactRoot: string | undefined;
  let runId: string = randomUUID();
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (
      arg === "--skill" ||
      arg === "--phase" ||
      arg === "--cursor-executable" ||
      arg === "--candidate" ||
      arg === "--one-shot" ||
      arg === "--fixture-run-root" ||
      arg === "--artifact-root" ||
      arg === "--run-id"
    ) {
      if (value === undefined || value.startsWith("--")) {
        throw new CursorUsageError(`${arg} requires a value`);
      }
      if (arg === "--skill") {
        if (!(CANONICAL_SKILLS as readonly string[]).includes(value)) {
          throw new CursorUsageError(
            `--skill must be one of ${CANONICAL_SKILLS.join("|")}`,
          );
        }
        skill = value as CanonicalSkill;
      } else if (arg === "--phase") {
        if (value !== "development" && value !== "held-out") {
          throw new CursorUsageError("--phase must be development or held-out");
        }
        phase = value;
      } else if (arg === "--cursor-executable") {
        cursorExecutable = value;
      } else if (arg === "--candidate") {
        candidatePath = value;
      } else if (arg === "--one-shot") {
        oneShotPath = value;
      } else if (arg === "--fixture-run-root") {
        fixtureRunRoot = value;
      } else if (arg === "--artifact-root") {
        artifactRoot = value;
      } else {
        runId = value;
      }
      index += 1;
      continue;
    }
    throw new CursorUsageError(`Unknown cursor option: ${arg}`);
  }
  return {
    command,
    skill,
    phase,
    cursorExecutable,
    ...(candidatePath === undefined ? {} : { candidatePath }),
    ...(oneShotPath === undefined ? {} : { oneShotPath }),
    ...(fixtureRunRoot === undefined ? {} : { fixtureRunRoot }),
    ...(artifactRoot === undefined ? {} : { artifactRoot }),
    runId,
  };
}

export async function loadText(path: string): Promise<string> {
  return await readFile(resolve(path), "utf8");
}

// implements REQ-skillopt-cursor-compat
export async function runCursorCommand(
  parsed: ParsedCursorArgs,
): Promise<number> {
  const operatorBase = await resolveOperatorBase();
  const artifactRoot =
    parsed.artifactRoot ?? resolve(operatorBase, "cursor", parsed.runId);
  const qualification = await runCursorQualification({
    cursorExecutable: parsed.cursorExecutable,
    cwd: process.cwd(),
  });
  await writeFile(
    resolve(artifactRoot, "cursor-qualification.json"),
    `${JSON.stringify(qualification, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  process.stderr.write(
    `skillopt-cursor qualification verdict=${qualification.verdict}\n`,
  );
  for (const check of qualification.checks) {
    process.stderr.write(
      `  ${check.name}: ${check.status} (${check.detail})\n`,
    );
  }
  if (parsed.command === "qualify") {
    return qualification.verdict === "pass" ? 0 : 1;
  }
  if (qualification.verdict !== "pass") {
    process.stderr.write(
      `skillopt-cursor compat skipped: not qualified\nreasons=${qualification.reasons.join(",")}\n`,
    );
    return 1;
  }
  if (parsed.fixtureRunRoot === undefined) {
    throw new CursorUsageError("compat requires --fixture-run-root");
  }
  if (parsed.candidatePath === undefined) {
    throw new CursorUsageError("compat requires --candidate PATH");
  }
  const baselineBody = await loadText(
    resolve(
      "packages",
      "cli",
      "src",
      "public",
      "skills",
      parsed.skill,
      "SKILL.md",
    ),
  ).then((text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""));
  const candidates = [
    { variant: "baseline" as const, body: baselineBody },
    ...(parsed.oneShotPath === undefined
      ? []
      : [
          {
            variant: "one-shot" as const,
            body: await loadText(parsed.oneShotPath),
          },
        ]),
    {
      variant: "skillopt" as const,
      body: await loadText(parsed.candidatePath),
    },
  ];
  const report = await runCursorCompatibilityGate({
    runId: parsed.runId,
    skill: parsed.skill,
    phase: parsed.phase,
    fixtureRunRoot: resolve(parsed.fixtureRunRoot),
    sourceWorktree: process.cwd(),
    artifactRoot,
    cursorExecutable: parsed.cursorExecutable,
    hostVersion: qualification.cursorVersion ?? "unknown",
    candidates,
    qualification,
    env: process.env,
  });
  const reportPath = await persistCursorCompatibilityReport(
    artifactRoot,
    report,
  );
  process.stderr.write(
    `skillopt-cursor compat verdict=${report.verdict} report=${reportPath}\n`,
  );
  for (const reason of report.reasons) {
    process.stderr.write(`  reason: ${reason}\n`);
  }
  return report.verdict === "compatible" || report.verdict === "informational"
    ? 0
    : 1;
}

export async function main(args: readonly string[]): Promise<number> {
  let parsed: ParsedCursorArgs;
  try {
    parsed = parseCursorArgs(args);
  } catch (error) {
    if (error instanceof CursorUsageError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
  try {
    return await runCursorCommand(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
