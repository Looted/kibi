import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  CampaignArtifactError,
  readCampaignManifest,
  readPublicFeedback,
} from "./campaign-artifacts";
import { runBundlePackageCampaign } from "./campaign-bundle-package";
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
  "--candidate-manifest",
  "--previous-evaluation",
  "--evaluation",
  "--repeats",
  "--max-target-episodes",
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
    "Common: --source-root PATH",
    "revise: --skill SKILL --objective-file FILE --heading HEADING --allow-paid [--feedback FILE]",
    "compose: --skill SKILL --insertion-file FILE [--insertion-file FILE ...]",
    "evaluate: --skill SKILL --candidate-manifest FILE [1..3] --max-target-episodes N --repeats 1..3 --allow-paid",
    "confirm: --previous-evaluation FILE --max-target-episodes N --repeats 1..3 --allow-paid",
    "package: --candidate-manifest FILE [1..4] [--evaluation FILE] OR --candidate-manifest <bundle-manifest>",
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

async function isBundleManifestPath(path: string): Promise<boolean> {
  try {
    const parsed: unknown = JSON.parse(await readFile(resolve(path), "utf8"));
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "artifactType" in parsed &&
      parsed.artifactType === "skillopt-bundle-manifest"
    );
  } catch {
    return false;
  }
}

async function manifests(
  args: ParsedArgs,
): Promise<readonly Awaited<ReturnType<typeof readCampaignManifest>>[]> {
  const paths = repeated(args, "--candidate-manifest");
  if (paths.length === 0)
    throw new CampaignCliError("at least one --candidate-manifest is required");
  return Promise.all(paths.map((path) => readCampaignManifest(path)));
}

async function packageSelection(args: ParsedArgs): Promise<
  | Readonly<{ kind: "bundle"; path: string }>
  | Readonly<{
      kind: "individual";
      manifests: readonly Awaited<ReturnType<typeof readCampaignManifest>>[];
    }>
> {
  const paths = repeated(args, "--candidate-manifest");
  if (paths.length === 0)
    throw new CampaignCliError("at least one --candidate-manifest is required");
  const bundlePaths = (
    await Promise.all(
      paths.map(async (path) =>
        (await isBundleManifestPath(path)) ? path : undefined,
      ),
    )
  ).filter((path): path is string => path !== undefined);
  if (bundlePaths.length > 0) {
    if (paths.length !== 1)
      throw new CampaignCliError(
        "bundle --candidate-manifest is mutually exclusive with individual candidate paths",
      );
    return { kind: "bundle", path: bundlePaths[0] as string };
  }
  return { kind: "individual", manifests: await manifests(args) };
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
  dependencies?: Partial<CampaignDependencies>,
): Promise<number> {
  try {
    const args = parseArgs(argv);
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
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({ command: args.command, status: "complete", skill: manifest.skill, frozenBodyHash: manifest.frozenBodyHash })}\n`,
      );
      return 0;
    }
    if (args.command === "compose") {
      const manifest = await runComposeCampaign({
        sourceRoot: source,
        artifactRoot: artifact,
        skill: skill(value(args, "--skill")),
        insertions: await composeInsertions(args),
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({ command: args.command, status: "complete", skill: manifest.skill, frozenBodyHash: manifest.frozenBodyHash })}\n`,
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
        dependencies,
      });
      process.stdout.write(
        `${JSON.stringify({ command: args.command, status: evaluation.status, runId: evaluation.runId, noRegression: evaluation.aggregate.noRegression, contentHash: evaluation.contentHash })}\n`,
      );
      return 0;
    }
    const evaluationPath = optionalValue(args, "--evaluation");
    const selection = await packageSelection(args);
    if (selection.kind === "bundle") {
      const receipt = await runBundlePackageCampaign({
        sourceRoot: source,
        artifactRoot: artifact,
        bundleManifestPath: selection.path,
        ...(evaluationPath === undefined ? {} : { evaluation: evaluationPath }),
        dependencies:
          dependencies === undefined
            ? undefined
            : {
                ...(dependencies.sourceFence === undefined
                  ? {}
                  : { sourceFence: dependencies.sourceFence }),
                ...(dependencies.surface === undefined
                  ? {}
                  : { surface: dependencies.surface }),
                ...(dependencies.assemble === undefined
                  ? {}
                  : { assemble: dependencies.assemble }),
              },
      });
      process.stdout.write(
        `${JSON.stringify({
          command: args.command,
          status: "ready-for-review",
          skills: receipt.skills
            .filter((entry) => entry.bodyChanged)
            .map((entry) => entry.id)
            .sort(),
        })}\n`,
      );
      return 0;
    }
    const receipt = await runPackageCampaign({
      sourceRoot: source,
      artifactRoot: artifact,
      manifests: selection.manifests,
      ...(evaluationPath === undefined
        ? {}
        : { evaluation: await readCompleteCampaignEvaluation(evaluationPath) }),
      dependencies,
    });
    process.stdout.write(
      `${JSON.stringify({
        command: args.command,
        status: "ready-for-review",
        skills: receipt.skills
          .filter((entry) => entry.bodyChanged)
          .map((entry) => entry.id)
          .sort(),
      })}\n`,
    );
    return 0;
  } catch (error) {
    if (
      error instanceof CampaignCliError ||
      error instanceof CampaignArtifactError ||
      error instanceof z.ZodError
    ) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      return error instanceof CampaignCliError ? 2 : 1;
    }
    throw error;
  }
}

if (import.meta.main) process.exitCode = await campaignMain();
