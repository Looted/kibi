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

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  copySchemaFiles,
  createKbDirectoryStructure,
  createManifestFile,
  ensureSymbolsManifestFile,
  getCurrentBranch,
  installGitHooks,
  installHook,
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

  test("getCurrentBranch throws error if git fails and KIBI_BRANCH not set", async () => {
    try {
      await getCurrentBranch(tmpDir);
      throw new Error("Expected getCurrentBranch to throw");
    } catch (error) {
      expect((error as Error).message).toContain(
        "Failed to resolve active branch",
      );
    }
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
    expect(content).toContain(".kb/verification/");
    expect(content).toContain(".kb/briefs/");
    expect(content).toContain(".kb/migrations/");
    expect(content).toContain(".kb/usage.log");
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
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");
    expect(existsSync(path.join(hooksDir, "pre-commit"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-checkout"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-merge"))).toBe(true);

    const stats = statSync(path.join(hooksDir, "pre-commit"));
    expect(stats.mode & 0o111).not.toBe(0);

    const postCheckoutContent = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf8",
    );
    expect(postCheckoutContent).toContain("kibi sync");

    const preCommitContent = readFileSync(
      path.join(hooksDir, "pre-commit"),
      "utf8",
    );
    expect(preCommitContent).toContain(".kb/symbols.yaml");
    expect(preCommitContent).toContain(
      "kibi sync --refresh-symbol-coordinates",
    );
  });

  test("installGitHooks creates hooks without --refresh-symbol-coordinates", () => {
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");

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
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");
    const postCheckout = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf8",
    );
    expect(postCheckout).toContain("kibi sync");
    expect(postCheckout).not.toContain("kibi branch ensure");
  });
});
