import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export type TrustedPullRequestSnapshot = Readonly<{
  repository: string;
  targetRef: string;
  targetCommit: string;
  targetTree: string;
  headCommit: string;
  headTree: string;
  mergeBaseCommit: string;
  mergeBaseTree: string;
}>;

type PullRequestPayload = Readonly<{
  repository?: { full_name?: unknown };
  pull_request?: {
    base?: {
      ref?: unknown;
      sha?: unknown;
      repo?: { full_name?: unknown };
    };
    head?: { sha?: unknown };
  };
}>;

const OBJECT_ID = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

function runGit(root: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function resolveCommit(root: string, input: string): string {
  if (!OBJECT_ID.test(input))
    throw new Error("PR event contains an invalid Git object ID");
  const resolved = runGit(root, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${input}^{commit}`,
  ]);
  if (!OBJECT_ID.test(resolved))
    throw new Error("Git returned an invalid commit ID");
  return resolved;
}

function resolveTree(root: string, commit: string): string {
  const tree = runGit(root, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${commit}^{tree}`,
  ]);
  if (!OBJECT_ID.test(tree)) throw new Error("Git returned an invalid tree ID");
  return tree;
}

/** Verify a GitHub pull_request_target envelope against the protected checkout. */
export function resolveTrustedPullRequestSnapshot(
  workspaceRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): TrustedPullRequestSnapshot {
  if (environment.GITHUB_EVENT_NAME !== "pull_request_target")
    throw new Error("Trusted impact gate requires pull_request_target context");
  const eventPath = environment.GITHUB_EVENT_PATH;
  const repository = environment.GITHUB_REPOSITORY;
  const trustedTargetRef = environment.KIBI_IMPACT_TRUSTED_TARGET_REF;
  const githubSha = environment.GITHUB_SHA;
  if (!eventPath || !repository || !trustedTargetRef || !githubSha)
    throw new Error(
      "Trusted PR event, repository, target ref and GitHub event SHA are required",
    );
  if (!/^[^/]+\/[^/]+$/.test(repository))
    throw new Error("GitHub repository identity is invalid");
  if (!/^refs\/heads\/[A-Za-z0-9._/-]+$/.test(trustedTargetRef))
    throw new Error("Trusted target must be a full refs/heads/... name");
  const payload = JSON.parse(
    readFileSync(eventPath, "utf8"),
  ) as PullRequestPayload;
  const request = payload.pull_request;
  const base = request?.base;
  const head = request?.head;
  const baseRef = base?.ref;
  const targetInput = base?.sha;
  const headInput = head?.sha;
  if (
    typeof baseRef !== "string" ||
    typeof targetInput !== "string" ||
    typeof headInput !== "string" ||
    base?.repo?.full_name !== repository
  )
    throw new Error(
      "PR event does not identify this repository's base and head",
    );
  if (trustedTargetRef !== `refs/heads/${baseRef}`)
    throw new Error("PR target does not match the configured protected branch");
  if (payload.repository?.full_name !== repository)
    throw new Error(
      "PR event repository identity does not match the trusted checkout",
    );
  const targetCommit = resolveCommit(workspaceRoot, targetInput);
  const headCommit = resolveCommit(workspaceRoot, headInput);
  if (resolveCommit(workspaceRoot, githubSha) !== targetCommit)
    throw new Error(
      "GitHub event target SHA does not match its trusted payload",
    );
  const checkoutCommit = resolveCommit(
    workspaceRoot,
    runGit(workspaceRoot, ["rev-parse", "HEAD"]),
  );
  if (checkoutCommit !== targetCommit)
    throw new Error("Trusted evaluator checkout is not the PR target commit");
  if (
    runGit(workspaceRoot, ["rev-parse", "--is-shallow-repository"]) !== "false"
  )
    throw new Error("Complete Git history is required for impact evaluation");
  const missing = runGit(workspaceRoot, [
    "rev-list",
    "--objects",
    "--missing=print",
    targetCommit,
    headCommit,
  ]);
  if (missing.split("\n").some((line) => line.startsWith("?")))
    throw new Error("PR target or head has missing reachable Git objects");
  const mergeBases = runGit(workspaceRoot, [
    "merge-base",
    "--all",
    targetCommit,
    headCommit,
  ])
    .split("\n")
    .filter(Boolean);
  if (mergeBases.length !== 1)
    throw new Error("PR target and head must have exactly one merge base");
  const mergeBaseCommit = resolveCommit(workspaceRoot, mergeBases[0] ?? "");
  return {
    repository,
    targetRef: trustedTargetRef,
    targetCommit,
    targetTree: resolveTree(workspaceRoot, targetCommit),
    headCommit,
    headTree: resolveTree(workspaceRoot, headCommit),
    mergeBaseCommit,
    mergeBaseTree: resolveTree(workspaceRoot, mergeBaseCommit),
  };
}
