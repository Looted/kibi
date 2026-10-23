import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  CampaignArtifactError,
  readCampaignManifest,
  readPublicFeedback,
} from "./campaign-artifacts";
import {
  type CampaignDependencies,
  readCompleteCampaignEvaluation,
  runComposeCampaign,
  runConfirmCampaign,
  runEvaluateCampaign,
  runPackageCampaign,
  runReviseCampaign,
} from "./campaign-workflow";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { runBoundedProcess } from "./runtime/process";
import {
  SKILLOPT_HOSTS,
  SkillOptHostSelectionError,
  envWithSkillOptHost,
  resolveSkillOptHost,
} from "./runtime/skillopt-host";
import { skillOptHostImplementation } from "./runtime/skillopt-host-registry";

const COMMANDS = new Set([
  "revise",
  "compose",
  "evaluate",
  "confirm",
  "package",
]);
const VALUE_FLAGS = new Set([
  "--artifact-root",
  "--source-root",
  "--skill",
  "--objective-file",
  "--heading",
  "--feedback",
  "--insertion-file",
  "--body-file",
  "--description-file",
  "--candidate-manifest",
  "--previous-evaluation",
  "--evaluation",
  "--repeats",
  "--max-target-episodes",
  "--host",
]);

const InsertionFileSchema = z
  .object({ headingAnchor: z.string().min(1), paragraph: z.string().min(1) })
  .strict();

type ParsedArgs = Readonly<{
  command: string;
  values: ReadonlyMap<string, string>;
  repeated: ReadonlyMap<string, readonly string[]>;
  allowPaid: boolean;
}>;

export class CampaignCliError extends Error {
  readonly name = "CampaignCliError";
}

function usage(): string {
  return [
    "Usage: campaign.ts <revise|compose|evaluate|confirm|package> --artifact-root PATH [options]",
    `Common: --source-root PATH --host ${SKILLOPT_HOSTS.join("|")} (default: KIBI_SKILLOPT_HOST, else codex)`,
    "revise: --skill SKILL --objective-file FILE --heading HEADING --allow-paid [--feedback FILE]",
    "compose: --skill SKILL (--body-file FILE [--description-file FILE] | --insertion-file FILE [--insertion-file FILE ...])",
    "evaluate: --skill SKILL --candidate-manifest FILE [1..3] --max-target-episodes N --repeats 1..3 --allow-paid",
    "confirm: --previous-evaluation FILE --max-target-episodes N --repeats 1..3 --allow-paid",
    "package: --candidate-manifest FILE [1..4] [--evaluation FILE]",
  ].join("\n");
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const command = args[0];
  if (command === undefined || !COMMANDS.has(command))
    throw new CampaignCliError(usage());
  const values = new Map<string, string>();
  const repeated = new Map<string, string[]>();
  let allowPaid = false;
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--allow-paid") {
      if (allowPaid)
        throw new CampaignCliError("--allow-paid may be supplied once");
      allowPaid = true;
      continue;
    }
    if (flag === undefined || !VALUE_FLAGS.has(flag))
      throw new CampaignCliError(`unknown option: ${flag ?? ""}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CampaignCliError(`${flag} requires a value`);
    index += 1;
    if (flag === "--candidate-manifest" || flag === "--insertion-file") {
      const current = repeated.get(flag) ?? [];
      current.push(value);
      repeated.set(flag, current);
    } else {
      if (values.has(flag))
        throw new CampaignCliError(`${flag} may be supplied once`);
      values.set(flag, value);
    }
  }
  return { command, values, repeated, allowPaid };
}

function value(args: ParsedArgs, flag: string): string {
  const result = args.values.get(flag);
  if (result === undefined || result.length === 0)
    throw new CampaignCliError(`${flag} is required`);
  return result;
}

function optionalValue(args: ParsedArgs, flag: string): string | undefined {
  return args.values.get(flag);
}

function skill(valueToParse: string): CanonicalSkill {
  if (!CANONICAL_SKILLS.includes(valueToParse as CanonicalSkill))
    throw new CampaignCliError(`unknown skill: ${valueToParse}`);
  return valueToParse as CanonicalSkill;
}

function boundedInteger(
  args: ParsedArgs,
  flag: string,
  min: number,
  max: number,
): number {
  const parsed = Number(value(args, flag));
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max)
    throw new CampaignCliError(
      `${flag} must be an integer from ${min} to ${max}`,
    );
  return parsed;
}

async function currentGitRoot(): Promise<string> {
  const result = await runBoundedProcess({
    argv: ["git", "rev-parse", "--show-toplevel"],
    cwd: process.cwd(),
    env: process.env,
    timeoutMs: 10_000,
  });
  if (result.exitCode !== 0)
    throw new CampaignCliError("current directory is not a git worktree");
  return realpath(result.stdout.trim());
}

async function sourceRoot(args: ParsedArgs): Promise<string> {
  const root = await currentGitRoot();
  const requested = optionalValue(args, "--source-root");
  if (requested === undefined) return root;
  const resolved = await realpath(resolve(requested));
  if (resolved !== root)
    throw new CampaignCliError("--source-root must be the current git root");
  return resolved;
}

function repeated(args: ParsedArgs, flag: string): readonly string[] {
  return args.repeated.get(flag) ?? [];
}

async function manifests(
  args: ParsedArgs,
): Promise<readonly Awaited<ReturnType<typeof readCampaignManifest>>[]> {
  const paths = repeated(args, "--candidate-manifest");
  if (paths.length === 0)
    throw new CampaignCliError("at least one --candidate-manifest is required");
  return Promise.all(paths.map((path) => readCampaignManifest(path)));
}

/** A description file holds one line; drop only the editor's final newline. */
async function readDescriptionFile(path: string): Promise<string> {
  const text = await readFile(resolve(path), "utf8");
  return text.replace(/\r?\n$/, "");
}

async function composeInsertions(args: ParsedArgs) {
  const paths = repeated(args, "--insertion-file");
  if (paths.length < 1 || paths.length > 4)
    throw new CampaignCliError(
      "compose accepts one to four --insertion-file values",
    );
  return Promise.all(
    paths.map(async (path) =>
      InsertionFileSchema.parse(
        JSON.parse(await readFile(resolve(path), "utf8")),
      ),
    ),
  );
}

export async function campaignMain(
  argv: readonly string[] = process.argv.slice(2),
  explicitDependencies?: Partial<CampaignDependencies>,
): Promise<number> {
  try {
    const args = parseArgs(argv);
    // The harness is chosen per run: --host wins over KIBI_SKILLOPT_HOST and
    // Codex is the default. It is resolved before any artifact or paid work
    // and pinned in the environment every step and cell inherits.
    const host = resolveSkillOptHost({
      requested: optionalValue(args, "--host"),
      env: process.env,
    });
    const env = envWithSkillOptHost(process.env, host);
    const dependencies =
      explicitDependencies ??
      skillOptHostImplementation(host).campaignDependencies(env);
    const source = await sourceRoot(args);
    const artifact = resolve(value(args, "--artifact-root"));
    if (args.command === "revise") {
      const feedbackPath = optionalValue(args, "--feedback");
      const manifest = await runReviseCampaign({
        sourceRoot: source,
        artifactRoot: artifact,
        skill: skill(value(args, "--skill")),
        objective: await readFile(
          resolve(value(args, "--objective-file")),
          "utf8",
        ),
        headingAnchor: value(args, "--heading"),
        allowPaid: args.allowPaid,
        ...(feedbackPath === undefined
          ? {}
          : { feedback: await readPublicFeedback(feedbackPath) }),
        env,
        host,
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({ command: args.command, status: "complete", skill: manifest.skill, frozenBodyHash: manifest.frozenBodyHash })}\n`,
      );
      return 0;
    }
    if (args.command === "compose") {
      const bodyFile = optionalValue(args, "--body-file");
      const descriptionFile = optionalValue(args, "--description-file");
      if (
        bodyFile !== undefined &&
        repeated(args, "--insertion-file").length > 0
      )
        throw new CampaignCliError(
          "--body-file and --insertion-file are mutually exclusive",
        );
      if (descriptionFile !== undefined && bodyFile === undefined)
        throw new CampaignCliError("--description-file requires --body-file");
      const manifest = await runComposeCampaign({
        sourceRoot: source,
        artifactRoot: artifact,
        skill: skill(value(args, "--skill")),
        insertions: bodyFile === undefined ? await composeInsertions(args) : [],
        ...(bodyFile === undefined
          ? {}
          : { replacementBody: await readFile(resolve(bodyFile), "utf8") }),
        ...(descriptionFile === undefined
          ? {}
          : {
              replacementDescription:
                await readDescriptionFile(descriptionFile),
            }),
        host,
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({
          command: args.command,
          status: "complete",
          skill: manifest.skill,
          frozenBodyHash: manifest.frozenBodyHash,
          ...(manifest.frozenDescriptionHash === undefined
            ? {}
            : { frozenDescriptionHash: manifest.frozenDescriptionHash }),
        })}\n`,
      );
      return 0;
    }
    if (args.command === "evaluate") {
      const candidates = await manifests(args);
      const evaluation = await runEvaluateCampaign({
        sourceRoot: source,
        artifactRoot: artifact,
        skill: skill(value(args, "--skill")),
        manifests: candidates,
        repeats: boundedInteger(args, "--repeats", 1, 3) as 1 | 2 | 3,
        maxTargetEpisodes: boundedInteger(
          args,
          "--max-target-episodes",
          1,
          256,
        ),
        allowPaid: args.allowPaid,
        env,
        host,
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({ command: args.command, status: evaluation.status, runId: evaluation.runId, noRegression: evaluation.aggregate.noRegression, contentHash: evaluation.contentHash })}\n`,
      );
      return 0;
    }
    if (args.command === "confirm") {
      const previous = await readCompleteCampaignEvaluation(
        value(args, "--previous-evaluation"),
      );
      const evaluation = await runConfirmCampaign({
        sourceRoot: source,
        artifactRoot: artifact,
        previousEvaluation: previous,
        repeats: boundedInteger(args, "--repeats", 1, 3) as 1 | 2 | 3,
        maxTargetEpisodes: boundedInteger(
          args,
          "--max-target-episodes",
          1,
          256,
        ),
        allowPaid: args.allowPaid,
        env,
        host,
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({ command: args.command, status: evaluation.status, runId: evaluation.runId, noRegression: evaluation.aggregate.noRegression, contentHash: evaluation.contentHash })}\n`,
      );
      return 0;
    }
    const evaluationPath = optionalValue(args, "--evaluation");
    const receipt = await runPackageCampaign({
      sourceRoot: source,
      artifactRoot: artifact,
      manifests: await manifests(args),
      ...(evaluationPath === undefined
        ? {}
        : { evaluation: await readCompleteCampaignEvaluation(evaluationPath) }),
      env,
      host,
      dependencies,
    });
    process.stdout.write(
      `${JSON.stringify({
        command: args.command,
        status: "ready-for-review",
        skills: receipt.skills
          .filter((entry) => entry.bodyChanged || entry.descriptionChanged)
          .map((entry) => entry.id)
          .sort(),
      })}\n`,
    );
    return 0;
  } catch (error) {
    if (
      error instanceof CampaignCliError ||
      error instanceof SkillOptHostSelectionError ||
      error instanceof CampaignArtifactError ||
      error instanceof z.ZodError
    ) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      return error instanceof CampaignCliError ||
        error instanceof SkillOptHostSelectionError
        ? 2
        : 1;
    }
    throw error;
  }
}

if (import.meta.main) process.exitCode = await campaignMain();
