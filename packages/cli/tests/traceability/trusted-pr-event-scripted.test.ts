import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type TrustedGitRunner,
  resolveTrustedPullRequestSnapshot,
} from "../../src/traceability/trusted-pr-event.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const T = "1".repeat(40);
const H = "2".repeat(40);
const M = "3".repeat(64);
const tree = (c: string) => `${c[0]}${"f".repeat(c.length - 1)}`;

function eventFile(payload: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-pr-event-"));
  roots.push(dir);
  const file = path.join(dir, "event.json");
  writeFileSync(
    file,
    typeof payload === "string" ? payload : JSON.stringify(payload),
  );
  return file;
}

const PAYLOAD = {
  repository: { full_name: "owner/repo" },
  pull_request: {
    base: { ref: "main", sha: T, repo: { full_name: "owner/repo" } },
    head: { sha: H },
  },
};

function env(
  overrides: Record<string, string | undefined> = {},
  payload: unknown = PAYLOAD,
): NodeJS.ProcessEnv {
  return {
    GITHUB_EVENT_NAME: "pull_request_target",
    GITHUB_EVENT_PATH: eventFile(payload),
    GITHUB_REPOSITORY: "owner/repo",
    KIBI_IMPACT_TRUSTED_TARGET_REF: "refs/heads/main",
    GITHUB_SHA: T,
    ...overrides,
  };
}

type Script = Partial<{
  resolve: Record<string, string>;
  head: string;
  shallow: string;
  missing: string;
  mergeBase: string;
}>;

function scripted(script: Script = {}) {
  const calls: (readonly string[])[] = [];
  const git: TrustedGitRunner = (root, args) => {
    expect(root).toBe("/ws");
    calls.push(args);
    const key = args.join(" ");
    if (key === "rev-parse HEAD") return script.head ?? T;
    if (key === "rev-parse --is-shallow-repository")
      return script.shallow ?? "false";
    if (args[0] === "rev-list") return script.missing ?? `${T}\n${H} src`;
    if (args[0] === "merge-base") return script.mergeBase ?? M;
    const spec = args[3] as string;
    const [id, kind] = spec.split("^");
    const custom = script.resolve?.[spec];
    if (custom !== undefined) return custom;
    return kind === "{tree}" ? tree(id as string) : (id as string);
  };
  return { git, calls };
}

function resolve(environment: NodeJS.ProcessEnv, script?: Script) {
  return resolveTrustedPullRequestSnapshot(
    "/ws",
    environment,
    scripted(script).git,
  );
}

describe("resolveTrustedPullRequestSnapshot", () => {
  test("binds the event to the checkout and resolves every tree", () => {
    const s = scripted();
    expect(
      resolveTrustedPullRequestSnapshot("/ws", env(), s.git),
    ).toStrictEqual({
      repository: "owner/repo",
      targetRef: "refs/heads/main",
      targetCommit: T,
      targetTree: tree(T),
      headCommit: H,
      headTree: tree(H),
      mergeBaseCommit: M,
      mergeBaseTree: tree(M),
    });
    const verify = (spec: string) => [
      "rev-parse",
      "--verify",
      "--end-of-options",
      spec,
    ];
    expect(s.calls).toStrictEqual([
      verify(`${T}^{commit}`),
      verify(`${H}^{commit}`),
      verify(`${T}^{commit}`),
      ["rev-parse", "HEAD"],
      verify(`${T}^{commit}`),
      ["rev-parse", "--is-shallow-repository"],
      ["rev-list", "--objects", "--missing=print", T, H],
      ["merge-base", "--all", T, H],
      verify(`${M}^{commit}`),
      verify(`${T}^{tree}`),
      verify(`${H}^{tree}`),
      verify(`${M}^{tree}`),
    ]);
  });

  test("requires the pull_request_target context and its variables", () => {
    expect(() => resolve(env({ GITHUB_EVENT_NAME: "pull_request" }))).toThrow(
      new Error("Trusted impact gate requires pull_request_target context"),
    );
    const required = new Error(
      "Trusted PR event, repository, target ref and GitHub event SHA are required",
    );
    for (const name of [
      "GITHUB_EVENT_PATH",
      "GITHUB_REPOSITORY",
      "KIBI_IMPACT_TRUSTED_TARGET_REF",
      "GITHUB_SHA",
    ]) {
      expect(() => resolve(env({ [name]: undefined }))).toThrow(required);
      expect(() => resolve(env({ [name]: "" }))).toThrow(required);
    }
  });

  test("validates the repository identity and the protected ref", () => {
    for (const repository of ["o", "o/r/x", "/r", "o/"]) {
      expect(() => resolve(env({ GITHUB_REPOSITORY: repository }))).toThrow(
        new Error("GitHub repository identity is invalid"),
      );
    }
    for (const ref of [
      "main",
      "refs/heads/",
      "refs/tags/v1",
      "refs/heads/a b",
      "x refs/heads/main",
      "refs/heads/main\n",
    ]) {
      expect(() =>
        resolve(env({ KIBI_IMPACT_TRUSTED_TARGET_REF: ref })),
      ).toThrow(new Error("Trusted target must be a full refs/heads/... name"));
    }
    expect(
      resolve(
        env(
          { KIBI_IMPACT_TRUSTED_TARGET_REF: "refs/heads/Rel_1.2/x-y" },
          {
            ...PAYLOAD,
            pull_request: {
              ...PAYLOAD.pull_request,
              base: { ...PAYLOAD.pull_request.base, ref: "Rel_1.2/x-y" },
            },
          },
        ),
      ).targetRef,
    ).toBe("refs/heads/Rel_1.2/x-y");
  });

  test("requires the payload to identify this repository's base and head", () => {
    const err = new Error(
      "PR event does not identify this repository's base and head",
    );
    const pr = PAYLOAD.pull_request;
    for (const payload of [
      {},
      { pull_request: {} },
      { ...PAYLOAD, pull_request: { ...pr, base: { ...pr.base, ref: 1 } } },
      { ...PAYLOAD, pull_request: { ...pr, base: { ...pr.base, sha: 1 } } },
      { ...PAYLOAD, pull_request: { ...pr, head: { sha: 1 } } },
      { ...PAYLOAD, pull_request: { ...pr, head: undefined } },
      {
        ...PAYLOAD,
        pull_request: { ...pr, base: { ...pr.base, repo: undefined } },
      },
      {
        ...PAYLOAD,
        pull_request: {
          ...pr,
          base: { ...pr.base, repo: { full_name: "x/y" } },
        },
      },
    ]) {
      expect(() => resolve(env({}, payload))).toThrow(err);
    }
  });

  test("the payload base ref must be the protected branch", () => {
    expect(() =>
      resolve(env({ KIBI_IMPACT_TRUSTED_TARGET_REF: "refs/heads/release" })),
    ).toThrow(
      new Error("PR target does not match the configured protected branch"),
    );
  });

  test("the payload repository must be the trusted checkout", () => {
    const err = new Error(
      "PR event repository identity does not match the trusted checkout",
    );
    expect(() =>
      resolve(env({}, { ...PAYLOAD, repository: { full_name: "x/y" } })),
    ).toThrow(err);
    expect(() =>
      resolve(env({}, { pull_request: PAYLOAD.pull_request })),
    ).toThrow(err);
  });

  test("refuses invalid object ids from the event and from git", () => {
    const invalid = new Error("PR event contains an invalid Git object ID");
    for (const sha of [
      "1".repeat(39),
      "1".repeat(41),
      "1".repeat(63),
      "1".repeat(65),
      "G".repeat(40),
      ` ${T}`,
      `${T} `,
    ]) {
      expect(() => resolve(env({ GITHUB_SHA: sha }))).toThrow(invalid);
    }
    expect(() =>
      resolve(env(), { resolve: { [`${T}^{commit}`]: "nope" } }),
    ).toThrow(new Error("Git returned an invalid commit ID"));
    expect(() =>
      resolve(env(), { resolve: { [`${H}^{tree}`]: "nope" } }),
    ).toThrow(new Error("Git returned an invalid tree ID"));
  });

  test("the event SHA and the checkout must be the target commit", () => {
    expect(() => resolve(env({ GITHUB_SHA: H }))).toThrow(
      new Error("GitHub event target SHA does not match its trusted payload"),
    );
    expect(() => resolve(env(), { head: H })).toThrow(
      new Error("Trusted evaluator checkout is not the PR target commit"),
    );
  });

  test("requires complete history and every reachable object", () => {
    expect(() => resolve(env(), { shallow: "true" })).toThrow(
      new Error("Complete Git history is required for impact evaluation"),
    );
    expect(() => resolve(env(), { missing: `${T}\n?${H}` })).toThrow(
      new Error("PR target or head has missing reachable Git objects"),
    );
    expect(resolve(env(), { missing: `${T} a?b` }).targetCommit).toBe(T);
  });

  test("requires exactly one merge base", () => {
    const err = new Error(
      "PR target and head must have exactly one merge base",
    );
    expect(() => resolve(env(), { mergeBase: "" })).toThrow(err);
    expect(() => resolve(env(), { mergeBase: `${M}\n${T}` })).toThrow(err);
    expect(resolve(env(), { mergeBase: `${M}\n` }).mergeBaseCommit).toBe(M);
  });
});

describe("resolveTrustedPullRequestSnapshot with git", () => {
  test("reads a real repository and the process environment by default", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-pr-event-repo-"));
    roots.push(root);
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "main");
    writeFileSync(path.join(root, "a.txt"), "a\n");
    git("add", "a.txt");
    git(
      "-c",
      "user.name=T",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "-qm",
      "base",
    );
    const target = git("rev-parse", "HEAD");
    const payload = {
      repository: { full_name: "owner/repo" },
      pull_request: {
        base: { ref: "main", sha: target, repo: { full_name: "owner/repo" } },
        head: { sha: target },
      },
    };
    const environment = env({ GITHUB_SHA: target }, payload);
    const event = resolveTrustedPullRequestSnapshot(root, environment);
    expect(event.targetCommit).toBe(target);
    expect(event.targetTree).toBe(git("rev-parse", "HEAD^{tree}"));
    expect(event.mergeBaseCommit).toBe(target);
    expect(() => resolveTrustedPullRequestSnapshot(root)).toThrow(
      process.env.GITHUB_EVENT_NAME === "pull_request_target"
        ? Error
        : new Error("Trusted impact gate requires pull_request_target context"),
    );
  });
});
