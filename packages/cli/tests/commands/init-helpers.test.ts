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
import { execSync } from "node:child_process";
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
  createConfigFile,
  createKbDirectoryStructure,
  ensureSymbolsManifestFile,
  getCurrentBranch,
  installGitHooks,
  installHook,
  updateGitIgnore,
} from "../../src/commands/init-helpers.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

describe("init-helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "kibi-test-init-helpers-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("getCurrentBranch returns current branch", async () => {
    execSync("git init", { cwd: tmpDir });
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
    const originalBranch = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "custom-branch";

    try {
      const branch = await getCurrentBranch(tmpDir);
      expect(branch).toBe("custom-branch");
    } finally {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });

  test("createKbDirectoryStructure creates expected directories", () => {
    const kbDir = path.join(tmpDir, ".kb");

    createKbDirectoryStructure(kbDir, "my-branch");

    expect(existsSync(kbDir)).toBe(true);
    expect(existsSync(path.join(kbDir, "schema"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches/my-branch"))).toBe(true);
  });

  test("createConfigFile creates valid config.json", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);

    createConfigFile(kbDir);

    const configPath = path.join(kbDir, "config.json");
    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, "utf8"));
    expect(config.paths).toBeDefined();
    expect(config.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(config.paths.requirements).toBe("documentation/requirements");
  });

  test("updateGitIgnore adds only .kb/", () => {
    updateGitIgnore(tmpDir);

    const gitignorePath = path.join(tmpDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, "utf8");
    expect(content).toContain(".kb/");
    expect(content).not.toContain(".kb/briefs/");
  });

  test("updateGitIgnore appends to existing .gitignore", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, "node_modules/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".kb/");
    expect(content).not.toContain(".kb/briefs/");
  });

  test("updateGitIgnore does not duplicate existing .kb entry", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, ".kb/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf8");
    const kbMatches = content.match(/^\.kb\/$/gm);

    expect(kbMatches?.length ?? 0).toBe(1);
    expect(content).not.toContain(".kb/briefs/");
  });

  test("ensureSymbolsManifestFile creates the default symbols manifest", () => {
    ensureSymbolsManifestFile(tmpDir);

    const manifestPath = path.join(tmpDir, "documentation", "symbols.yaml");
    expect(existsSync(manifestPath)).toBe(true);
    const content = readFileSync(manifestPath, "utf8");
    expect(content).toContain("# symbols.yaml");
    expect(content).toContain("symbols: []");
  });

  test("ensureSymbolsManifestFile preserves an existing manifest", () => {
    const manifestPath = path.join(tmpDir, "documentation", "symbols.yaml");
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
    expect(postCheckoutContent).toContain("sed 's/\\^.*//'");

    const preCommitContent = readFileSync(
      path.join(hooksDir, "pre-commit"),
      "utf8",
    );
    expect(preCommitContent).toContain("documentation/symbols.yaml");
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

  test("installed post-checkout hook preserves kibi branch ensure", () => {
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");
    const postCheckout = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf8",
    );
    // Must still call kibi branch ensure for branch tracking
    expect(postCheckout).toContain("kibi branch ensure");
    expect(postCheckout).toContain("kibi sync");
  });
});
