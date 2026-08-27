import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import { spawnSync } from "../helpers/isolated-env.js";

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");

interface KibiResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runKibi(args: string[], cwd: string): KibiResult {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function initializeGitRepo(cwd: string): void {
  spawnSync("git", ["init", "-b", "main"], { cwd, encoding: "utf8" });
  spawnSync("git", ["config", "user.email", "test@example.com"], {
    cwd,
    encoding: "utf8",
  });
  spawnSync("git", ["config", "user.name", "Kibi Test"], {
    cwd,
    encoding: "utf8",
  });
  spawnSync("git", ["commit", "--allow-empty", "-m", "init"], {
    cwd,
    encoding: "utf8",
  });
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

const LEGACY_KIBI_GITIGNORE = `.kb/
!.kb/config.json
!.kb/schema/
!.kb/relationships/
!.kb/relationships/*.yaml
`;

function writeLegacyGitIgnore(root: string): void {
  writeFileSync(path.join(root, ".gitignore"), LEGACY_KIBI_GITIGNORE, "utf8");
}

function gitCheckIgnoreStatus(cwd: string, relPath: string): number | null {
  return spawnSync("git", ["check-ignore", "-q", "--", relPath], {
    cwd,
    encoding: "utf8",
  }).status;
}

function writeLegacyConfig(
  root: string,
  extra: Record<string, unknown> = {},
): void {
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "config.json"),
    `${JSON.stringify(
      {
        schemaVersion: 4,
        paths: {
          requirements: "documentation/requirements",
          symbols: "documentation/symbols.yaml",
        },
        ...extra,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function writeLegacyKnowledge(root: string): void {
  mkdirSync(path.join(root, "documentation/requirements"), { recursive: true });
  writeFileSync(
    path.join(root, "documentation/requirements/REQ-ONE.md"),
    "---\nid: REQ-ONE\ntype: req\ntitle: One\nstatus: active\n---\n\nKeep this.\n",
    "utf8",
  );
  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(
    path.join(root, "src", "greet.ts"),
    `export function greet() {
  return "hello";
}
`,
    "utf8",
  );
  writeFileSync(
    path.join(root, "documentation", "symbols.yaml"),
    `symbols:
  - id: SYM-GREET-FILE
    title: greet.ts
    sourceFile: src/greet.ts
    links:
      - REQ-GREET
    status: active
`,
    "utf8",
  );
}

describe("kibi migrate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-migrate-"));
    initializeGitRepo(tmpDir);
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("fresh init is already current and --yes is a no-op", () => {
    expect(runKibi(["init", "--no-hooks"], tmpDir).status).toBe(0);
    const result = runKibi(["migrate", "--yes"], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No migration needed");
    expect(existsSync(path.join(tmpDir, ".kb", "config.json"))).toBe(false);
    expect(
      readJson(path.join(tmpDir, ".kb", "manifest.json")).schemaVersion,
    ).toBe(LATEST_KB_SCHEMA_VERSION);
  });

  test("dry-run reports storage moves without writing files", () => {
    writeLegacyConfig(tmpDir, { schemaVersion: 1 });
    writeLegacyKnowledge(tmpDir);

    const result = runKibi(["migrate", "--dry-run"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("dry run");
    expect(result.stdout).toContain(
      "documentation/requirements/REQ-ONE.md -> .kb/requirements/REQ-ONE.md",
    );
    expect(result.stdout).toContain("would retire legacy .kb/config.json");
    expect(result.stdout).toContain("would mark 1 legacy coarse symbol");
    expect(
      existsSync(path.join(tmpDir, "documentation/requirements/REQ-ONE.md")),
    ).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb", "manifest.json"))).toBe(false);
    expect(
      existsSync(path.join(tmpDir, ".kb", "migrations", "main.json")),
    ).toBe(false);
  });

  test("--yes moves knowledge, retires config.json, and writes the manifest", () => {
    writeLegacyConfig(tmpDir, {
      schemaVersion: 1,
      semanticAdvisorBackfill: "pending",
    });
    writeLegacyKnowledge(tmpDir);

    const result = runKibi(["migrate", "--yes"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Moved");
    expect(result.stdout).toContain("Retired legacy .kb/config.json");
    expect(result.stdout).toContain("Marked 1 existing coarse symbol");
    expect(existsSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"))).toBe(
      true,
    );
    expect(
      readFileSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"), "utf8"),
    ).toContain("Keep this.");
    expect(existsSync(path.join(tmpDir, ".kb", "config.json"))).toBe(false);
    const manifest = readJson(path.join(tmpDir, ".kb", "manifest.json"));
    expect(manifest.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(manifest.semanticAdvisorBackfill).toBe("pending");
    expect(
      readFileSync(path.join(tmpDir, ".kb", "symbols.yaml"), "utf8"),
    ).toContain("granularity_reason: legacy-link");
    const audit = readJson(path.join(tmpDir, ".kb", "migrations", "main.json"));
    expect(audit.toVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(audit.symbolGranularityLegacyLinks).toBe(1);
  });

  test("--yes rewrites the pre-canonical gitignore fence so migrated knowledge is trackable", () => {
    writeLegacyConfig(tmpDir, { schemaVersion: 1 });
    writeLegacyKnowledge(tmpDir);
    writeLegacyGitIgnore(tmpDir);

    expect(gitCheckIgnoreStatus(tmpDir, ".kb/requirements/REQ-ONE.md")).toBe(0);

    const result = runKibi(["migrate", "--yes"], tmpDir);
    expect(result.status).toBe(0);

    const gitignore = readFileSync(path.join(tmpDir, ".gitignore"), "utf8");
    expect(gitignore).not.toMatch(/^\.kb\/$/m);
    expect(gitignore).toContain(".kb/migrations/");
    expect(gitCheckIgnoreStatus(tmpDir, ".kb/requirements/REQ-ONE.md")).toBe(1);
    expect(gitCheckIgnoreStatus(tmpDir, ".kb/migrations/main.json")).toBe(0);
  });

  test("dry-run does not rewrite a legacy gitignore fence", () => {
    writeLegacyConfig(tmpDir, { schemaVersion: 1 });
    writeLegacyKnowledge(tmpDir);
    writeLegacyGitIgnore(tmpDir);

    const result = runKibi(["migrate", "--dry-run"], tmpDir);
    expect(result.status).toBe(0);
    expect(readFileSync(path.join(tmpDir, ".gitignore"), "utf8")).toBe(
      LEGACY_KIBI_GITIGNORE,
    );
  });

  test("malformed leftover config is a blocker and does not guess documentation/ paths", () => {
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeFileSync(path.join(tmpDir, ".kb", "config.json"), "{", "utf8");
    writeLegacyKnowledge(tmpDir);
    writeLegacyGitIgnore(tmpDir);

    const result = runKibi(["migrate", "--yes"], tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("malformed");
    expect(result.stderr).toContain("will not infer");
    expect(
      existsSync(path.join(tmpDir, "documentation/requirements/REQ-ONE.md")),
    ).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"))).toBe(
      false,
    );
    expect(readFileSync(path.join(tmpDir, ".gitignore"), "utf8")).toBe(
      LEGACY_KIBI_GITIGNORE,
    );
  });

  test("blocks conflicting destinations instead of overwriting", () => {
    writeLegacyConfig(tmpDir);
    writeLegacyKnowledge(tmpDir);
    mkdirSync(path.join(tmpDir, ".kb/requirements"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, ".kb/requirements/REQ-ONE.md"),
      "canonical copy\n",
      "utf8",
    );

    const result = runKibi(["migrate", "--yes"], tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("already exists");
    expect(
      readFileSync(
        path.join(tmpDir, "documentation/requirements/REQ-ONE.md"),
        "utf8",
      ),
    ).toContain("Keep this.");
    expect(
      readFileSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"), "utf8"),
    ).toBe("canonical copy\n");
  });

  test("rejects manifest schema versions newer than the CLI", () => {
    expect(runKibi(["init", "--no-hooks"], tmpDir).status).toBe(0);
    const manifestPath = path.join(tmpDir, ".kb", "manifest.json");
    const manifest = readJson(manifestPath);
    writeFileSync(
      manifestPath,
      `${JSON.stringify({ ...manifest, schemaVersion: 999 }, null, 2)}\n`,
      "utf8",
    );

    const result = runKibi(["migrate", "--yes"], tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unsupported schemaVersion 999");
  });

  test("second --yes run is a no-op", () => {
    writeLegacyConfig(tmpDir, { schemaVersion: 2 });
    writeLegacyKnowledge(tmpDir);

    const firstRun = runKibi(["migrate", "--yes"], tmpDir);
    expect(firstRun.status).toBe(0);

    const manifestPath = path.join(tmpDir, ".kb", "manifest.json");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");
    const manifestBefore = readFileSync(manifestPath, "utf8");
    const auditBefore = readFileSync(auditPath, "utf8");
    const auditMtimeBefore = statSync(auditPath).mtimeMs;

    const secondRun = runKibi(["migrate", "--yes"], tmpDir);
    expect(secondRun.status).toBe(0);
    expect(secondRun.stdout).toContain("No migration needed");
    expect(readFileSync(manifestPath, "utf8")).toBe(manifestBefore);
    expect(readFileSync(auditPath, "utf8")).toBe(auditBefore);
    expect(statSync(auditPath).mtimeMs).toBe(auditMtimeBefore);
  });
});
