/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { spawnSync as rawSpawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  MANAGED_HOOK_NAMES,
  copySchemaFiles,
  createKbDirectoryStructure,
  createManifestFile,
  ensureSymbolsManifestFile,
  getCurrentBranch,
  hookDelegationSnippet,
  installGitHooks,
  installHook,
  outdatedManagedHooks,
  updateGitIgnore,
} from "../../src/commands/init-helpers.js";
import { branchStoreKey } from "../../src/utils/branch-store-locator.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import { execSync, spawnSync } from "../helpers/isolated-env.js";

describe("init-helpers", () => {
  let tmpDir: string;
  let originalKibiBranch: string | undefined;

  beforeEach(() => {
    originalKibiBranch = process.env.KIBI_BRANCH;
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    tmpDir = mkdtempSync(path.join(tmpdir(), "kibi-test-init-helpers-"));
  });

  afterEach(() => {
    if (originalKibiBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalKibiBranch;
    }
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("getCurrentBranch returns current branch", async () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync("git checkout -b test-branch", { cwd: tmpDir });

    const branch = await getCurrentBranch(tmpDir);
    expect(branch).toBe("test-branch");
  });

  test("getCurrentBranch names the no-Git store outside Git", async () => {
    expect(await getCurrentBranch(tmpDir)).toBe("kibi-internal/no-git");
  });

  test("getCurrentBranch throws when the branch cannot be resolved", async () => {
    await expect(
      getCurrentBranch(path.join(tmpDir, "missing")),
    ).rejects.toThrow("Failed to resolve active branch");
  });

  test("getCurrentBranch uses KIBI_BRANCH when git fails", async () => {
    process.env.KIBI_BRANCH = "custom-branch";

    try {
      const branch = await getCurrentBranch(tmpDir);
      expect(branch).toBe("custom-branch");
    } finally {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    }
  });

  test("createKbDirectoryStructure creates expected directories", () => {
    const kbDir = path.join(tmpDir, ".kb");

    createKbDirectoryStructure(kbDir, "my-branch");

    expect(existsSync(kbDir)).toBe(true);
    expect(existsSync(path.join(kbDir, "schema"))).toBe(true);
    expect(existsSync(path.join(kbDir, "requirements"))).toBe(true);
    expect(existsSync(path.join(kbDir, "scenarios"))).toBe(true);
    expect(existsSync(path.join(kbDir, "tests"))).toBe(true);
    expect(existsSync(path.join(kbDir, "facts"))).toBe(true);
    expect(existsSync(path.join(kbDir, "adr"))).toBe(true);
    expect(existsSync(path.join(kbDir, "flags"))).toBe(true);
    expect(existsSync(path.join(kbDir, "events"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches"))).toBe(true);
    expect(
      existsSync(path.join(kbDir, "branches", branchStoreKey("my-branch"))),
    ).toBe(true);
  });

  test("createManifestFile writes a Kibi-owned lifecycle manifest", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);

    createManifestFile(kbDir);

    const manifestPath = path.join(kbDir, "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.manifestVersion).toBe(1);
    expect(manifest.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(manifest.paths).toBeUndefined();
    expect(manifest.checks).toBeUndefined();
  });

  test("updateGitIgnore ignores derived .kb/ state only", () => {
    updateGitIgnore(tmpDir);

    const gitignorePath = path.join(tmpDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, "utf8");
    expect(content).toContain(".kb/branches/");
    expect(content).toContain(".kb/recovery/");
    expect(content).toContain(".kb/proof/runs/");
    expect(content).toContain(".kb/briefs/");
    expect(content).toContain(".kb/migrations/");
    expect(content).toContain(".kb/usage.log");
    expect(content).toContain(".env.kibi");
    expect(content).not.toMatch(/^\.kb\/$/m);
  });

  test("updateGitIgnore appends to existing .gitignore", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, "node_modules/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".kb/branches/");
  });

  test("updateGitIgnore does not duplicate existing derived-state entries", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, ".kb/branches/\n.kb/recovery/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf8");
    const branchMatches = content.match(/^\.kb\/branches\/$/gm);
    expect(branchMatches?.length ?? 0).toBe(1);
  });

  test("updateGitIgnore strips the pre-canonical .kb/ fence so authored lanes are trackable", () => {
    execSync("git init -b main", { cwd: tmpDir });
    const gitignorePath = path.join(tmpDir, ".gitignore");
    // Historical Kibi init wrote `.kb/` plus selective reincludes. Without
    // `!.kb/`, Git treats that fence as a blanket ignore of migrated
    // knowledge lanes. The fingerprint still matches with any `!.kb/...`.
    writeFileSync(
      gitignorePath,
      `.kb/
!.kb/config.json
!.kb/schema/
!.kb/relationships/
!.kb/relationships/*.yaml
`,
    );
    mkdirSync(path.join(tmpDir, ".kb/requirements"), { recursive: true });
    mkdirSync(path.join(tmpDir, ".kb/branches/main"), { recursive: true });
    mkdirSync(path.join(tmpDir, ".kb/migrations"), { recursive: true });
    writeFileSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"), "req\n");
    writeFileSync(path.join(tmpDir, ".kb/branches/main/store.json"), "{}\n");
    writeFileSync(path.join(tmpDir, ".kb/migrations/main.json"), "{}\n");

    expect(
      spawnSync(
        "git",
        ["check-ignore", "-q", "--", ".kb/requirements/REQ-ONE.md"],
        {
          cwd: tmpDir,
        },
      ).status,
    ).toBe(0);

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf8");
    expect(content).not.toMatch(/^\.kb\/$/m);
    expect(content).not.toContain("!.kb/config.json");
    expect(content).toContain(".kb/migrations/");
    expect(
      spawnSync(
        "git",
        ["check-ignore", "-q", "--", ".kb/requirements/REQ-ONE.md"],
        {
          cwd: tmpDir,
        },
      ).status,
    ).toBe(1);
    expect(
      spawnSync(
        "git",
        ["check-ignore", "-q", "--", ".kb/branches/main/store.json"],
        {
          cwd: tmpDir,
        },
      ).status,
    ).toBe(0);
    expect(
      spawnSync(
        "git",
        ["check-ignore", "-q", "--", ".kb/migrations/main.json"],
        {
          cwd: tmpDir,
        },
      ).status,
    ).toBe(0);
  });

  test("ensureSymbolsManifestFile creates the canonical symbols manifest", () => {
    ensureSymbolsManifestFile(tmpDir);

    const manifestPath = path.join(tmpDir, ".kb", "symbols.yaml");
    expect(existsSync(manifestPath)).toBe(true);
    const content = readFileSync(manifestPath, "utf8");
    expect(content).toContain("# symbols.yaml");
    expect(content).toContain("symbols: []");
  });

  test("ensureSymbolsManifestFile preserves an existing manifest", () => {
    const manifestPath = path.join(tmpDir, ".kb", "symbols.yaml");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, "symbols:\n  - id: SYM-existing\n");

    ensureSymbolsManifestFile(tmpDir);

    expect(readFileSync(manifestPath, "utf8")).toBe(
      "symbols:\n  - id: SYM-existing\n",
    );
  });

  test("copySchemaFiles includes sourceFile in copied schema", async () => {
    const sourceDir = path.join(tmpDir, "source");
    mkdirSync(sourceDir);
    // Create a minimal entities.pl with sourceFile
    writeFileSync(
      path.join(sourceDir, "entities.pl"),
      "entity_property(_, sourceFile, uri).\n",
    );

    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(kbDir, "schema"));

    await copySchemaFiles(kbDir, sourceDir);

    const copied = readFileSync(path.join(kbDir, "schema/entities.pl"), "utf8");
    expect(copied).toContain("sourceFile");
  });

  test("copySchemaFiles includes executable_for in copied schema", async () => {
    const sourceDir = path.join(tmpDir, "source");
    mkdirSync(sourceDir);
    // Create a minimal relationships.pl with executable_for
    writeFileSync(
      path.join(sourceDir, "relationships.pl"),
      "relationship_type(executable_for).\nvalid_relationship(executable_for, symbol, test).\n",
    );

    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(kbDir, "schema"));

    await copySchemaFiles(kbDir, sourceDir);

    const copied = readFileSync(
      path.join(kbDir, "schema/relationships.pl"),
      "utf8",
    );
    expect(copied).toContain("executable_for");
  });

  test("CLI schema files contain required entries (sourceFile, executable_for)", () => {
    // These files are copied during kibi init and kibi sync
    const cliEntitiesPath = path.join(
      __dirname,
      "..",
      "..",
      "schema",
      "entities.pl",
    );
    const cliRelationshipsPath = path.join(
      __dirname,
      "..",
      "..",
      "schema",
      "relationships.pl",
    );

    const entitiesContent = readFileSync(cliEntitiesPath, "utf8");
    const relationshipsContent = readFileSync(cliRelationshipsPath, "utf8");

    // entities.pl must contain sourceFile property
    expect(entitiesContent).toContain("sourceFile");

    // relationships.pl must contain executable_for relationship type
    expect(relationshipsContent).toContain("executable_for");

    // relationships.pl must have verified_by from scenario to test
    expect(relationshipsContent).toContain("verified_by, scenario, test");

    // relationships.pl must have validates from test to scenario
    expect(relationshipsContent).toContain("validates, test, scenario");
  });

  test("copySchemaFiles copies .pl files", async () => {
    const sourceDir = path.join(tmpDir, "source");
    mkdirSync(sourceDir);
    writeFileSync(path.join(sourceDir, "test.pl"), "test content");
    writeFileSync(path.join(sourceDir, "other.txt"), "ignore me");

    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(kbDir, "schema"));

    await copySchemaFiles(kbDir, sourceDir);

    expect(existsSync(path.join(kbDir, "schema/test.pl"))).toBe(true);
    expect(existsSync(path.join(kbDir, "schema/other.txt"))).toBe(false);
  });

  describe("installHook", () => {
    test("creates a new hook with a shebang, kibi section, and executable permissions", () => {
      const hookPath = path.join(tmpDir, "pre-commit");
      const hookContent = 'echo "kibi check --staged"';

      installHook(hookPath, hookContent);

      expect(existsSync(hookPath)).toBe(true);
      expect(readFileSync(hookPath, "utf8")).toBe(
        `#!/bin/sh\n# BEGIN kibi-managed\n${hookContent}\n# END kibi-managed\n`,
      );
      expect(statSync(hookPath).mode & 0o111).not.toBe(0);
    });

    test("replaces only the kibi-managed section and preserves regex-special user content", () => {
      const hookPath = path.join(tmpDir, "post-checkout");
      const userPrelude =
        "#!/bin/sh\n# user content (a+b)? [keep] {safe} ^$ .*\n";
      const oldKibiSection =
        '# BEGIN kibi-managed\necho "old [kibi] (hook) .* + ? ^ $"\n# END kibi-managed';
      const userSuffix = '\necho "tail .* + ? ^ $ [ ] ( ) | \\\\ /"\n';
      const newHookContent = 'echo "new (kibi) [hook] .* + ? ^ $ | \\\\ /"';

      writeFileSync(hookPath, `${userPrelude}${oldKibiSection}${userSuffix}`);

      installHook(hookPath, newHookContent);

      expect(readFileSync(hookPath, "utf8")).toBe(
        `${userPrelude}# BEGIN kibi-managed\n${newHookContent}\n# END kibi-managed${userSuffix}`,
      );
      expect(readFileSync(hookPath, "utf8")).not.toContain("old [kibi] (hook)");
      expect(statSync(hookPath).mode & 0o111).not.toBe(0);
    });

    test("leaves a legacy non-kibi hook untouched", () => {
      const hookPath = path.join(tmpDir, "post-merge");
      const legacyHook = '#!/bin/sh\necho "user hook"\n';

      writeFileSync(hookPath, legacyHook);
      chmodSync(hookPath, 0o755);

      installHook(hookPath, 'echo "kibi sync"');

      expect(readFileSync(hookPath, "utf8")).toBe(legacyHook);
      expect(statSync(hookPath).mode & 0o111).not.toBe(0);
    });

    test("appends a kibi section with a shebang to an existing empty hook file", () => {
      const hookPath = path.join(tmpDir, "post-rewrite");
      const hookContent = 'echo "kibi sync"';

      writeFileSync(hookPath, "");

      installHook(hookPath, hookContent);

      expect(readFileSync(hookPath, "utf8")).toBe(
        `#!/bin/sh\n\n# BEGIN kibi-managed\n${hookContent}\n# END kibi-managed\n`,
      );
      expect(statSync(hookPath).mode & 0o111).not.toBe(0);
    });
  });

  test("installGitHooks creates hooks", () => {
    const hooksDir = path.join(tmpDir, ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });

    installGitHooks(hooksDir);

    expect(existsSync(path.join(hooksDir, "pre-commit"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-checkout"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-merge"))).toBe(true);

    const stats = statSync(path.join(hooksDir, "pre-commit"));
    expect(stats.mode & 0o111).not.toBe(0);

    const postCheckoutContent = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf8",
    );
    expect(postCheckoutContent).toContain("KIBI_BIN=");
    expect(postCheckoutContent).toContain('"$KIBI_BIN" sync');

    const postMergeContent = readFileSync(
      path.join(hooksDir, "post-merge"),
      "utf8",
    );
    expect(postMergeContent).toContain("KIBI_BIN=");
    expect(postMergeContent).toContain('"$KIBI_BIN" sync');

    const postRewriteContent = readFileSync(
      path.join(hooksDir, "post-rewrite"),
      "utf8",
    );
    expect(postRewriteContent).toContain("KIBI_BIN=");
    expect(postRewriteContent).toContain('"$KIBI_BIN" sync');

    const preCommitContent = readFileSync(
      path.join(hooksDir, "pre-commit"),
      "utf8",
    );
    expect(preCommitContent).toContain("KIBI_BIN=");
    expect(preCommitContent).toContain('"$KIBI_BIN" check --staged');
    expect(preCommitContent).toContain(
      '"$KIBI_BIN" check-generated --staged --changed-only',
    );
  });

  test("installGitHooks creates hooks without --refresh-symbol-coordinates", () => {
    const hooksDir = path.join(tmpDir, ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });

    installGitHooks(hooksDir);

    // All automatic hooks must NOT include coordinate-refresh flags
    const postCheckout = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf8",
    );
    expect(postCheckout).not.toContain("--refresh-symbol-coordinates");

    const postMerge = readFileSync(path.join(hooksDir, "post-merge"), "utf8");
    expect(postMerge).not.toContain("--refresh-symbol-coordinates");

    const postRewrite = readFileSync(
      path.join(hooksDir, "post-rewrite"),
      "utf8",
    );
    expect(postRewrite).not.toContain("--refresh-symbol-coordinates");
  });

  test("installed post-checkout hook uses source compilation without branch cloning", () => {
    const hooksDir = path.join(tmpDir, ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });

    installGitHooks(hooksDir);

    const postCheckout = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf8",
    );
    expect(postCheckout).toContain('"$KIBI_BIN" sync');
    expect(postCheckout).not.toContain("kibi branch ensure");
  });

  test("reports kibi-managed hook sections written by another CLI version", () => {
    const hooksDir = path.join(tmpDir, "hooks");
    installGitHooks(hooksDir);
    expect(outdatedManagedHooks(hooksDir)).toEqual([]);

    const preCommit = path.join(hooksDir, "pre-commit");
    writeFileSync(
      preCommit,
      readFileSync(preCommit, "utf8").replace(
        '"$KIBI_BIN" check-generated --staged --changed-only\n',
        "",
      ),
    );
    writeFileSync(
      path.join(hooksDir, "post-merge"),
      "#!/bin/sh\n# user-authored hook without kibi markers\n",
    );
    expect(outdatedManagedHooks(hooksDir)).toEqual(["pre-commit"]);
  });

  describe("generated POSIX sh hook node version-manager resolution", () => {
    const buildNodeFreePath = (): string => {
      if (!existsSync("/usr/bin/node") && !existsSync("/bin/node")) {
        return "/usr/bin:/bin";
      }
      const dir = path.join(tmpdir(), `kibi-node-free-path-${process.pid}`);
      mkdirSync(dir, { recursive: true });
      for (const tool of [
        "sh",
        "env",
        "dirname",
        "basename",
        "uname",
        "tr",
        "sed",
        "awk",
        "grep",
        "cat",
        "printf",
        "ls",
        "head",
        "tail",
        "sort",
        "mkdir",
        "rm",
        "cp",
        "mv",
        "test",
        "[",
        "readlink",
        "realpath",
      ]) {
        const dest = path.join(dir, tool);
        if (existsSync(dest)) continue;
        const src = existsSync(`/usr/bin/${tool}`)
          ? `/usr/bin/${tool}`
          : existsSync(`/bin/${tool}`)
            ? `/bin/${tool}`
            : null;
        if (src) {
          try {
            symlinkSync(src, dest);
          } catch {}
        }
      }
      return dir;
    };
    const STRIPPED_PATH = buildNodeFreePath();
    afterAll(() => {
      if (STRIPPED_PATH !== "/usr/bin:/bin") {
        rmSync(STRIPPED_PATH, { recursive: true, force: true });
      }
    });

    function createHookFixture() {
      const repoDir = path.join(tmpDir, "repo");
      const hooksDir = path.join(repoDir, ".git", "hooks");
      const fakeHome = path.join(tmpDir, "home");
      const logFile = path.join(tmpDir, "node-invocations.log");
      mkdirSync(hooksDir, { recursive: true });
      mkdirSync(fakeHome, { recursive: true });
      installGitHooks(hooksDir, { log: () => undefined });
      return { repoDir, hooksDir, fakeHome, logFile };
    }

    function writeLocalNodeKibiStub(repoDir: string) {
      const localBin = path.join(repoDir, "node_modules", ".bin");
      mkdirSync(localBin, { recursive: true });
      const kibiPath = path.join(localBin, "kibi");
      // Uses the same #!/usr/bin/env node shebang as the real kibi CLI.
      writeFileSync(kibiPath, "#!/usr/bin/env node\n// local kibi stub\n", {
        mode: 0o755,
      });
      return kibiPath;
    }

    function writeFakeNode(binDir: string, label: string, logFile: string) {
      mkdirSync(binDir, { recursive: true });
      const nodePath = path.join(binDir, "node");
      writeFileSync(
        nodePath,
        `#!/bin/sh\nprintf '%s|%s\\n' "${label}" "$*" >> "${logFile}"\n`,
        { mode: 0o755 },
      );
      return nodePath;
    }

    function runPosixHook(
      hookPath: string,
      repoDir: string,
      env: Record<string, string>,
      args: string[] = [],
    ) {
      return rawSpawnSync("/bin/sh", [hookPath, ...args], {
        cwd: repoDir,
        env,
        encoding: "utf8",
      });
    }

    test("all managed hooks and delegation snippets pass /bin/sh -n syntax check", () => {
      const { hooksDir } = createHookFixture();
      for (const hook of MANAGED_HOOK_NAMES) {
        const installed = rawSpawnSync(
          "/bin/sh",
          ["-n", path.join(hooksDir, hook)],
          {
            encoding: "utf8",
          },
        );
        expect(installed.status).toBe(0);
        expect(installed.stderr).toBe("");

        const snippetPath = path.join(tmpDir, `snippet-${hook}.sh`);
        writeFileSync(snippetPath, `#!/bin/sh\n${hookDelegationSnippet(hook)}`);
        const snippet = rawSpawnSync("/bin/sh", ["-n", snippetPath], {
          encoding: "utf8",
        });
        expect(snippet.status).toBe(0);
        expect(snippet.stderr).toBe("");
      }
    });

    test("resolves node from NVM_DIR/current/bin when node is off PATH", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);
      const nvmDir = path.join(tmpDir, "custom-nvm");
      writeFakeNode(
        path.join(nvmDir, "current", "bin"),
        "nvm-current",
        logFile,
      );
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v24.21.0", "bin"),
        "nvm-v24.21.0",
        logFile,
      );

      const res = runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
        PATH: STRIPPED_PATH,
        HOME: fakeHome,
        NVM_DIR: nvmDir,
      });

      expect(res.status).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("nvm-current|");
      expect(readFileSync(logFile, "utf8")).toContain("sync");
    });

    test("resolves node from nvm alias/default (exact, prefix, and chained alias)", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);
      const nvmDir = path.join(tmpDir, "nvm-alias");
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v9.0.0", "bin"),
        "v9.0.0",
        logFile,
      );
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v24.9.0", "bin"),
        "v24.9.0",
        logFile,
      );
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v24.14.1", "bin"),
        "v24.14.1",
        logFile,
      );
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v24.21.0", "bin"),
        "v24.21.0",
        logFile,
      );
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v240.0.0", "bin"),
        "v240.0.0",
        logFile,
      );

      // 1. Exact version without leading v (real nvm default format)
      mkdirSync(path.join(nvmDir, "alias"), { recursive: true });
      writeFileSync(path.join(nvmDir, "alias", "default"), "24.14.1\n");
      const exact = runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
        PATH: STRIPPED_PATH,
        HOME: fakeHome,
        NVM_DIR: nvmDir,
      });
      expect(exact.status).toBe(0);
      expect(readFileSync(logFile, "utf8").trim()).toStartWith("v24.14.1|");

      // 2. Prefix match ("24") prefers v24.21.0 numerically over v24.9.0 and ignores v240.0.0
      writeFileSync(logFile, "");
      writeFileSync(path.join(nvmDir, "alias", "default"), "24\n");
      const prefix = runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
        PATH: STRIPPED_PATH,
        HOME: fakeHome,
        NVM_DIR: nvmDir,
      });
      expect(prefix.status).toBe(0);
      expect(readFileSync(logFile, "utf8").trim()).toStartWith("v24.21.0|");

      // 3. Chained alias: default -> lts/* -> lts/krypton -> v24.14.1
      writeFileSync(logFile, "");
      mkdirSync(path.join(nvmDir, "alias", "lts"), { recursive: true });
      writeFileSync(path.join(nvmDir, "alias", "default"), "lts/*\n");
      writeFileSync(path.join(nvmDir, "alias", "lts", "*"), "lts/krypton\n");
      writeFileSync(path.join(nvmDir, "alias", "lts", "krypton"), "v24.14.1\n");
      const chained = runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
        PATH: STRIPPED_PATH,
        HOME: fakeHome,
        NVM_DIR: nvmDir,
      });
      expect(chained.status).toBe(0);
      expect(readFileSync(logFile, "utf8").trim()).toStartWith("v24.14.1|");
    });

    test("falls back to highest semver under $HOME/.nvm/versions/node and finds global kibi in that bin dir", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      const nvmVersions = path.join(fakeHome, ".nvm", "versions", "node");
      writeFakeNode(path.join(nvmVersions, "v9.0.0", "bin"), "v9.0.0", logFile);
      writeFakeNode(
        path.join(nvmVersions, "v24.9.0", "bin"),
        "v24.9.0",
        logFile,
      );
      const bestBin = path.join(nvmVersions, "v24.21.0", "bin");
      writeFakeNode(bestBin, "v24.21.0", logFile);
      writeFakeNode(
        path.join(nvmVersions, "not-a-version", "bin"),
        "junk",
        logFile,
      );
      // Global kibi installed alongside the nvm node binary (no node_modules/.bin/kibi).
      writeFileSync(
        path.join(bestBin, "kibi"),
        "#!/usr/bin/env node\n// global kibi in nvm bin\n",
        { mode: 0o755 },
      );

      const res = runPosixHook(
        path.join(hooksDir, "post-checkout"),
        repoDir,
        { PATH: STRIPPED_PATH, HOME: fakeHome },
        ["0000000", "1111111", "1"],
      );

      expect(res.status).toBe(0);
      const log = readFileSync(logFile, "utf8");
      expect(log).toContain("v24.21.0|");
      expect(log).toContain(`${bestBin}/kibi sync`);
    });

    test("resolves node from Volta (VOLTA_HOME and default $HOME/.volta)", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);

      const customVolta = path.join(tmpDir, "custom-volta");
      writeFakeNode(path.join(customVolta, "bin"), "volta-env", logFile);
      const fromEnv = runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
        PATH: STRIPPED_PATH,
        HOME: fakeHome,
        VOLTA_HOME: customVolta,
      });
      expect(fromEnv.status).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("volta-env|");

      writeFileSync(logFile, "");
      writeFakeNode(
        path.join(fakeHome, ".volta", "bin"),
        "volta-home",
        logFile,
      );
      const fromHome = runPosixHook(
        path.join(hooksDir, "post-merge"),
        repoDir,
        {
          PATH: STRIPPED_PATH,
          HOME: fakeHome,
        },
      );
      expect(fromHome.status).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("volta-home|");
    });

    test("resolves node from fnm (FNM_DIR, $HOME/.fnm, XDG_DATA_HOME, and node-versions fallback)", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);

      // 1. FNM_DIR/aliases/default/bin
      const customFnm = path.join(tmpDir, "custom-fnm");
      writeFakeNode(
        path.join(customFnm, "aliases", "default", "bin"),
        "fnm-dir",
        logFile,
      );
      expect(
        runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
          PATH: STRIPPED_PATH,
          HOME: fakeHome,
          FNM_DIR: customFnm,
        }).status,
      ).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("fnm-dir|");

      // 2. XDG_DATA_HOME/fnm/aliases/default/bin
      writeFileSync(logFile, "");
      const xdgData = path.join(tmpDir, "xdg-data");
      writeFakeNode(
        path.join(xdgData, "fnm", "aliases", "default", "bin"),
        "fnm-xdg",
        logFile,
      );
      expect(
        runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
          PATH: STRIPPED_PATH,
          HOME: fakeHome,
          XDG_DATA_HOME: xdgData,
        }).status,
      ).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("fnm-xdg|");

      // 3. $HOME/.fnm/aliases/default/bin
      writeFileSync(logFile, "");
      writeFakeNode(
        path.join(fakeHome, ".fnm", "aliases", "default", "bin"),
        "fnm-dotfnm",
        logFile,
      );
      expect(
        runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
          PATH: STRIPPED_PATH,
          HOME: fakeHome,
        }).status,
      ).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("fnm-dotfnm|");

      // 4. Fallback under node-versions/*/installation/bin with numeric semver comparison
      writeFileSync(logFile, "");
      const fnmFallback = path.join(tmpDir, "fnm-fallback");
      writeFakeNode(
        path.join(
          fnmFallback,
          "node-versions",
          "v9.0.0",
          "installation",
          "bin",
        ),
        "fnm-v9",
        logFile,
      );
      writeFakeNode(
        path.join(
          fnmFallback,
          "node-versions",
          "v24.9.0",
          "installation",
          "bin",
        ),
        "fnm-v24.9",
        logFile,
      );
      writeFakeNode(
        path.join(
          fnmFallback,
          "node-versions",
          "v24.21.0",
          "installation",
          "bin",
        ),
        "fnm-v24.21",
        logFile,
      );
      expect(
        runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
          PATH: STRIPPED_PATH,
          HOME: path.join(tmpDir, "empty-home"),
          FNM_DIR: fnmFallback,
        }).status,
      ).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("fnm-v24.21|");
    });

    test("resolves node from asdf and mise shims", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);

      const asdfDir = path.join(tmpDir, "custom-asdf");
      writeFakeNode(path.join(asdfDir, "shims"), "asdf-shim", logFile);
      expect(
        runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
          PATH: STRIPPED_PATH,
          HOME: fakeHome,
          ASDF_DATA_DIR: asdfDir,
        }).status,
      ).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("asdf-shim|");

      writeFileSync(logFile, "");
      const miseDir = path.join(tmpDir, "custom-mise");
      writeFakeNode(path.join(miseDir, "shims"), "mise-shim", logFile);
      expect(
        runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
          PATH: STRIPPED_PATH,
          HOME: fakeHome,
          MISE_DATA_DIR: miseDir,
        }).status,
      ).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("mise-shim|");
    });

    test("uses node already on PATH without overriding it from nvm", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);
      const pathBin = path.join(tmpDir, "path-bin");
      writeFakeNode(pathBin, "from-path", logFile);
      writeFakeNode(
        path.join(fakeHome, ".nvm", "versions", "node", "v24.21.0", "bin"),
        "from-nvm",
        logFile,
      );

      const res = runPosixHook(path.join(hooksDir, "post-merge"), repoDir, {
        PATH: `${pathBin}:${STRIPPED_PATH}`,
        HOME: fakeHome,
      });

      expect(res.status).toBe(0);
      const log = readFileSync(logFile, "utf8");
      expect(log).toContain("from-path|");
      expect(log).not.toContain("from-nvm|");
    });

    test("fails with actionable remediation mentioning kibi sync when node is absent everywhere", () => {
      const { repoDir, hooksDir, fakeHome } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);

      // If the test host happens to have system node in /opt/homebrew/bin or
      // /usr/local/bin, redirect those two probe paths in a temp copy so this
      // test exercises the absent-everywhere branch deterministically.
      let hookPath = path.join(hooksDir, "post-merge");
      if (
        existsSync("/opt/homebrew/bin/node") ||
        existsSync("/usr/local/bin/node")
      ) {
        hookPath = path.join(tmpDir, "post-merge-no-sys-node");
        const content = readFileSync(path.join(hooksDir, "post-merge"), "utf8")
          .replace('"/opt/homebrew/bin"', `"${path.join(fakeHome, "no-brew")}"`)
          .replace('"/usr/local/bin"', `"${path.join(fakeHome, "no-local")}"`);
        writeFileSync(hookPath, content, { mode: 0o755 });
      }

      // Build a minimal PATH dir with only non-node POSIX commands if /usr/bin/node exists.
      let isolatedPath = STRIPPED_PATH;
      if (existsSync("/usr/bin/node") || existsSync("/bin/node")) {
        const minBin = path.join(tmpDir, "min-bin");
        mkdirSync(minBin, { recursive: true });
        isolatedPath = minBin;
      }

      const res = runPosixHook(hookPath, repoDir, {
        PATH: isolatedPath,
        HOME: fakeHome,
      });

      expect(res.status).toBe(1);
      expect(res.stderr).toContain("cannot locate 'node'");
      expect(res.stderr).toContain("kibi sync");
    });

    test("post-checkout file checkout (branch_flag=0) exits 0 without probing node or kibi", () => {
      const { repoDir, hooksDir, fakeHome } = createHookFixture();
      const res = runPosixHook(
        path.join(hooksDir, "post-checkout"),
        repoDir,
        { PATH: "", HOME: fakeHome },
        ["0000000", "1111111", "0"],
      );
      expect(res.status).toBe(0);
      expect(res.stderr).toBe("");
    });

    test("pre-commit (set -e) and delegation snippet (set -eu) resolve nvm node cleanly", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      writeLocalNodeKibiStub(repoDir);
      const nvmDir = path.join(tmpDir, "nvm-strict");
      writeFakeNode(
        path.join(nvmDir, "versions", "node", "v24.21.0", "bin"),
        "nvm-strict",
        logFile,
      );

      // pre-commit uses `set -e` at the top of the template.
      const preCommit = runPosixHook(
        path.join(hooksDir, "pre-commit"),
        repoDir,
        { PATH: STRIPPED_PATH, HOME: fakeHome, NVM_DIR: nvmDir },
      );
      expect(preCommit.status).toBe(0);
      const preCommitLog = readFileSync(logFile, "utf8");
      expect(preCommitLog).toContain("check-generated --staged --changed-only");
      expect(preCommitLog).toContain("check --staged");

      // Delegation snippet under strict `set -eu` with HOME unset.
      writeFileSync(logFile, "");
      const strictSnippet = path.join(tmpDir, "strict-post-checkout.sh");
      writeFileSync(
        strictSnippet,
        `#!/bin/sh\nset -eu\n${hookDelegationSnippet("post-checkout")}`,
        { mode: 0o755 },
      );
      const snippetRes = runPosixHook(
        strictSnippet,
        repoDir,
        { PATH: STRIPPED_PATH, NVM_DIR: nvmDir },
        ["0000000", "1111111", "1"],
      );
      expect(snippetRes.status).toBe(0);
      expect(readFileSync(logFile, "utf8")).toContain("nvm-strict|");
    });

    test("exits promptly on Windows-style C:/ PWD when kibi CLI cannot be located", () => {
      const { repoDir, hooksDir, fakeHome, logFile } = createHookFixture();
      const fakeBin = path.join(tmpDir, "win-pwd-bin");
      writeFakeNode(fakeBin, "win-pwd", logFile);

      // Simulate Git for Windows setting PWD to a drive-letter path (C:/...)
      // where ${kibi_dir%/*} stops changing at "C:".
      const preCommit = readFileSync(path.join(hooksDir, "pre-commit"), "utf8");
      const probe = path.join(tmpDir, "win-pwd-probe.sh");
      writeFileSync(
        probe,
        preCommit.replace('kibi_dir="$PWD"', 'kibi_dir="C:/Users/demo/repo"'),
        { mode: 0o755 },
      );

      const res = spawnSync("/bin/sh", [probe], {
        cwd: repoDir,
        env: {
          PATH: `${fakeBin}:${STRIPPED_PATH}`,
          HOME: fakeHome,
        },
        encoding: "utf8",
        timeout: 5_000,
      });
      expect(res.signal).toBeNull();
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("cannot locate the kibi CLI");
    });
  });
});
