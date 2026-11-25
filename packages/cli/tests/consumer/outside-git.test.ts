import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  execFileSync,
  isolatedCliSandboxEnv,
  spawnSync,
} from "../helpers/isolated-env.js";
import { KIBI_CLI } from "./workspace.js";

/**
 * An agent sets Kibi up in a directory that is not a Git repository yet.
 * Before, kibi init failed there with a diagnostic that led with KIBI_BRANCH,
 * and every later command failed again. Now Kibi works on one store for the
 * directory, advises Git without failing, refuses only the features that
 * read Git (GIT_REQUIRED), and carries the knowledge over after git init.
 */

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-outside-git-")),
  );
  roots.push(root);
  return root;
}

function cliEnv(root: string, overrides: NodeJS.ProcessEnv = {}) {
  return isolatedCliSandboxEnv({
    // Nothing above the temporary directory may count as its repository.
    GIT_CEILING_DIRECTORIES: path.dirname(root),
    KIBI_TELEMETRY: "0",
    ...overrides,
  });
}

function kibi(
  root: string,
  args: string[],
  input?: string,
  overrides: NodeJS.ProcessEnv = {},
) {
  const result = spawnSync(process.execPath, [KIBI_CLI, ...args], {
    cwd: root,
    encoding: "utf8",
    env: cliEnv(root, overrides),
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  };
}

type Envelope = {
  status: string;
  data: Record<string, unknown> | null;
  diagnostics: { code: string; severity?: string; message?: string }[];
  error?: { code: string; message: string; retryable: boolean };
};

function json(
  root: string,
  args: string[],
  input: unknown = {},
  overrides: NodeJS.ProcessEnv = {},
): { status: number | null; envelope: Envelope; stderr: string } {
  const run = kibi(
    root,
    [...args, "--input", "-"],
    JSON.stringify(input),
    overrides,
  );
  return {
    status: run.status,
    envelope: JSON.parse(run.stdout) as Envelope,
    stderr: run.stderr,
  };
}

function codes(envelope: Envelope): string[] {
  return envelope.diagnostics.map((diagnostic) => diagnostic.code);
}

function stores(root: string): string[] {
  const dir = path.join(root, ".kb", "branches");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map(
    (key) =>
      (
        JSON.parse(
          readFileSync(path.join(dir, key, "branch.json"), "utf8"),
        ) as {
          branch: string;
        }
      ).branch,
  );
}

function requirement(id: string, title: string) {
  return {
    type: "req",
    id,
    properties: { title, status: "open", text_ref: title, priority: "must" },
  };
}

const HAND_WRITTEN = `---
title: Invoices are numbered per year
status: open
priority: must
id: REQ-demo-invoice-numbers
type: req
---
Invoices are numbered per year.
`;

const NO_GIT = "kibi-internal/no-git";

/**
 * A PATH with the test runner, Node (the engine daemon's host) and
 * SWI-Prolog (when it comes from PATH rather than the bundle), but no Git.
 */
function pathWithoutGit(): string {
  const bin = workspace();
  symlinkSync(
    process.execPath,
    path.join(bin, path.basename(process.execPath)),
  );
  const dirs = (process.env.PATH ?? "").split(path.delimiter);
  for (const tool of ["node", "swipl"]) {
    const found = dirs
      .map((dir) => path.join(dir, tool))
      .find((file) => path.isAbsolute(file) && existsSync(file));
    const link = path.join(bin, tool);
    if (found !== undefined && !existsSync(link)) symlinkSync(found, link);
  }
  return bin;
}

describe("Kibi outside a Git repository", () => {
  test("init, status, record, sync, search and check work on one store, with the advisory", () => {
    const root = workspace();

    const init = kibi(root, ["init"]);
    expect(init.status).toBe(0);
    expect(init.stdout).toContain("Kibi initialized");
    expect(init.stdout).toContain(
      "- Git hooks: not installed; this directory has no Git repository",
    );
    expect(init.stdout).toContain("! No Git repository: Kibi is working");
    expect(readFileSync(path.join(root, "AGENTS.md"), "utf8")).toContain(
      "finish each change with `kibi check`",
    );
    expect(stores(root)).toEqual([NO_GIT]);

    // A second process: the step that failed in the field.
    const status = json(root, ["status"]);
    expect(status.status).toBe(0);
    expect(status.stderr).toBe("");
    expect(status.envelope.data?.branch).toBe(NO_GIT);
    expect(status.envelope.data?.versionControl).toMatchObject({
      versionControl: "none",
      reason: "not_a_repository",
      suggestion: "git init && kibi init",
    });
    expect(codes(status.envelope)).toContain("no_git_repository");

    const upsert = json(
      root,
      ["upsert"],
      requirement("REQ-demo-export", "Reports export as CSV"),
    );
    expect(upsert.envelope.status, upsert.stderr).toBe("success");

    const search = json(root, ["search"], { query: "export CSV" });
    expect(search.stderr).toBe("");
    expect(JSON.stringify(search.envelope.data)).toContain("REQ-demo-export");
    expect(codes(search.envelope)).not.toContain("no_git_repository");

    // A source written by hand is input without any receipt.
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-demo-invoice-numbers.md"),
      HAND_WRITTEN,
    );
    expect(kibi(root, ["sync"]).status).toBe(0);
    const found = json(root, ["search"], {
      query: "invoices numbered per year",
    });
    expect(JSON.stringify(found.envelope.data)).toContain(
      "REQ-demo-invoice-numbers",
    );
    expect(
      existsSync(path.join(root, ".kb", "recovery", "pending-sources")),
    ).toBe(false);

    const check = json(root, ["check"]);
    expect(check.envelope.status).toBe("success");
    expect(codes(check.envelope)).toContain("no_git_repository");

    const doctor = kibi(root, ["doctor"]);
    expect(doctor.stdout).toContain("No Git repository: Kibi is working");
    expect(doctor.stdout).not.toContain("✗ Git");
  }, 60_000);

  test("usage telemetry records working without Git as success and a Git feature as rejected, with vcs none", () => {
    const root = workspace();
    const telemetryDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-no-git-tel-"),
    );
    roots.push(telemetryDir);
    const telemetry = {
      KIBI_TELEMETRY: "1",
      KIBI_TELEMETRY_DIR: telemetryDir,
    };
    expect(kibi(root, ["init"], undefined, telemetry).status).toBe(0);
    expect(json(root, ["status"], {}, telemetry).status).toBe(0);
    expect(kibi(root, ["check", "--staged"], undefined, telemetry).status).toBe(
      1,
    );
    const events = readFileSync(
      path.join(telemetryDir, "telemetry-queue.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).properties);
    expect(
      events.map(({ status, error_category, vcs, vcs_reason }) => [
        status,
        error_category ?? null,
        vcs,
        vcs_reason,
      ]),
    ).toEqual([
      ["success", null, "none", "not_a_repository"],
      ["success", null, "none", "not_a_repository"],
      ["rejected", "git_required", "none", "not_a_repository"],
    ]);
  });

  test("the features that read Git refuse with GIT_REQUIRED and name the alternative", () => {
    const root = workspace();
    expect(kibi(root, ["init"]).status).toBe(0);

    const staged = kibi(root, ["check", "--staged"]);
    expect(staged.status).toBe(1);
    expect(staged.stderr).toContain(
      "Error [GIT_REQUIRED]: kibi check --staged needs a Git repository",
    );
    expect(staged.stderr).toContain("Run `kibi check`");

    for (const args of [["gc"], ["check-diff"], ["hooks", "install"]]) {
      const run = kibi(root, args);
      expect([args, run.status]).toEqual([args, 1]);
      expect(run.stderr).toContain("Error [GIT_REQUIRED]:");
    }

    const review = json(root, ["prepare-impact-review"], {
      scope: { kind: "staged" },
    });
    expect(review.status).toBe(1);
    expect(review.envelope.error).toMatchObject({
      code: "GIT_REQUIRED",
      retryable: false,
    });
  });

  test("after git init the knowledge carries over to the new branch, once", () => {
    const root = workspace();
    expect(kibi(root, ["init"]).status).toBe(0);
    json(
      root,
      ["upsert"],
      requirement("REQ-demo-export", "Reports export as CSV"),
    );
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-demo-invoice-numbers.md"),
      HAND_WRITTEN,
    );

    execFileSync("git", ["init", "-q", "-b", "main"], {
      cwd: root,
      env: cliEnv(root),
    });
    const first = json(root, ["search"], { query: "export CSV" });
    expect(first.envelope.status).toBe("success");
    expect(JSON.stringify(first.envelope.data)).toContain("REQ-demo-export");
    expect(codes(first.envelope)).toContain("no_git_store_adopted");
    expect(codes(first.envelope)).not.toContain("no_git_repository");
    const retired = readdirSync(
      path.join(root, ".kb", "recovery", "no-git-adoption"),
    );
    expect(retired.filter((name) => name.endsWith("-store"))).toHaveLength(1);
    expect(stores(root)).toEqual(["main"]);

    const second = json(root, ["search"], {
      query: "invoices numbered per year",
    });
    expect(JSON.stringify(second.envelope.data)).toContain(
      "REQ-demo-invoice-numbers",
    );
    expect(codes(second.envelope)).not.toContain("no_git_store_adopted");

    const init = kibi(root, ["init"]);
    expect(init.status).toBe(0);
    expect(init.stdout).not.toContain("No Git repository");
  }, 60_000);

  test("KIBI_BRANCH names a store for the processes that set it; the directory's own store stays", () => {
    const root = workspace();
    const init = kibi(root, ["init"], undefined, { KIBI_BRANCH: "main" });
    expect(init.status).toBe(0);
    expect(init.stdout).toContain(
      "KIBI_BRANCH=main selects this store only in processes that set it",
    );
    const status = json(root, ["status"]);
    expect(status.status).toBe(0);
    expect(status.envelope.data?.branch).toBe(NO_GIT);
    const reserved = json(root, ["status"], {}, { KIBI_BRANCH: NO_GIT });
    expect(reserved.status).toBe(1);
  });

  test("a .git entry Git does not accept is refused, never treated as no repository", () => {
    const root = workspace();
    mkdirSync(path.join(root, ".git"));
    const status = json(root, ["status"]);
    expect(status.status).toBe(1);
    expect(status.envelope.error).toMatchObject({
      code: "GIT_REPOSITORY_UNREADABLE",
      retryable: false,
    });
    expect(stores(root)).toEqual([]);
  });

  test("without Git installed Kibi still works, and says to install Git first", () => {
    const root = workspace();
    const noGit = { PATH: pathWithoutGit() };
    const init = kibi(root, ["init"], undefined, noGit);
    expect(init.status, init.stderr).toBe(0);
    expect(init.stdout).toContain("Git is not installed (or not on PATH)");
    const status = json(root, ["status"], {}, noGit);
    expect(status.status).toBe(0);
    expect(status.envelope.data?.versionControl).toMatchObject({
      reason: "git_unavailable",
    });
    const upsert = json(
      root,
      ["upsert"],
      requirement("REQ-demo-export", "Reports export as CSV"),
      noGit,
    );
    expect(upsert.envelope.status, JSON.stringify(upsert.envelope.error)).toBe(
      "success",
    );
  });
});
