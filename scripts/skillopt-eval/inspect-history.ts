import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBundledSkillFrom } from "../../packages/cli/src/public/skills";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { inspectHistoricalCandidates } from "./historical-candidates";

const HELP =
  "Usage: inspect-history.ts [--artifact-root PATH] [--baseline-root PATH]\nOffline inventory and screening only. No model calls or adoption.\n";

// implements REQ-skillopt-codex-optimization
export async function main(
  args: readonly string[],
  output: { stdout: (text: string) => void; stderr: (text: string) => void } = {
    stdout: (text) => {
      process.stdout.write(text);
    },
    stderr: (text) => {
      process.stderr.write(text);
    },
  },
): Promise<number> {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "help")) {
    output.stdout(HELP);
    return 0;
  }
  let artifactRoot = resolve(
    process.env.XDG_CACHE_HOME ?? resolve(homedir(), ".cache"),
    "kibi-skillopt/operator/optimize",
  );
  let baselineRoot = fileURLToPath(
    new URL("../../packages/cli/dist/public/skills/", import.meta.url),
  );
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (
      (flag !== "--artifact-root" && flag !== "--baseline-root") ||
      seen.has(flag) ||
      !value ||
      value.startsWith("--")
    ) {
      output.stderr(HELP);
      return 2;
    }
    seen.add(flag);
    if (flag === "--artifact-root") artifactRoot = resolve(value);
    else baselineRoot = resolve(value);
  }
  try {
    const baselineBodies: Partial<Record<CanonicalSkill, string>> = {};
    for (const skill of CANONICAL_SKILLS) {
      const built = loadBundledSkillFrom(baselineRoot, skill);
      if (!seen.has("--baseline-root")) {
        const source = loadBundledSkillFrom(
          fileURLToPath(
            new URL("../../packages/cli/src/public/skills/", import.meta.url),
          ),
          skill,
        );
        if (
          source.body !== built.body ||
          JSON.stringify(source.manifest) !== JSON.stringify(built.manifest)
        ) {
          throw new Error(
            `Bundled baseline ${skill} is stale; run bun run build:cli`,
          );
        }
      }
      baselineBodies[skill] = built.body;
    }
    const report = await inspectHistoricalCandidates({
      artifactRoot,
      baselineBodies,
    });
    output.stdout(`${JSON.stringify({ ...report, baselineRoot }, null, 2)}\n`);
    // Candidate rejection is a successful screening result; a bad root is not.
    return report.diagnostics.some(
      (diagnostic) => diagnostic.runId === undefined,
    )
      ? 1
      : 0;
  } catch (error) {
    output.stderr(
      `Historical screening failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
