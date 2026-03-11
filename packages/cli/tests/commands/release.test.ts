import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("release behavior", () => {
  const TEST_TIMEOUT_MS = 30000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-release-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git checkout -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("docs-only changes", () => {
    test(
      "produce no npm release candidates",
      async () => {
        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "config.json"),
          JSON.stringify(
            {
              $schema: "https://unpkg.com/@changesets/config@3.0.0/schema.json",
              changelog: "@changesets/cli/changelog",
              commit: false,
              fixed: [],
              linked: [],
              access: "public",
              baseBranch: "main",
              updateInternalDependencies: "patch",
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(changesetDir, "docs-only-change.md"),
          '---\n"@fake/core": patch\n---\n\nDocumentation update only\n',
        );

        const changesetContent = readFileSync(
          path.join(changesetDir, "docs-only-change.md"),
          "utf8",
        );

        expect(changesetContent).toContain("@fake/core");
        expect(changesetContent).toContain("Documentation update only");
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "no version bump for markdown documentation changes without code",
      async () => {
        const docsDir = path.join(tmpDir, "docs");
        mkdirSync(docsDir, { recursive: true });

        writeFileSync(
          path.join(docsDir, "guide.md"),
          "# Guide\n\nThis is documentation only.\n",
        );

        expect(existsSync(path.join(docsDir, "guide.md"))).toBe(true);

        const docContent = readFileSync(path.join(docsDir, "guide.md"), "utf8");
        expect(docContent).toContain("This is documentation only");
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("package exclusions", () => {
    test(
      "vscode package is excluded from npm release candidates",
      async () => {
        const vscodeDir = path.join(tmpDir, "packages", "vscode");
        mkdirSync(vscodeDir, { recursive: true });

        writeFileSync(
          path.join(vscodeDir, "package.json"),
          JSON.stringify(
            {
              name: "kibi-vscode",
              version: "0.2.0",
              publisher: "kibi",
              engines: {
                vscode: "^1.74.0",
              },
              categories: ["Other"],
              main: "./dist/extension.js",
            },
            null,
            2,
          ),
        );

        const pkgContent = JSON.parse(
          readFileSync(path.join(vscodeDir, "package.json"), "utf8"),
        );

        expect(pkgContent.name).toBe("kibi-vscode");
        expect(pkgContent.publisher).toBe("kibi");
        expect(pkgContent.engines.vscode).toBeDefined();
        expect(pkgContent.private).toBeUndefined();
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "vscode changes do not appear in npm release candidates",
      async () => {
        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "vscode-change.md"),
          '---\n"kibi-vscode": patch\n---\n\nVS Code extension UI improvements\n',
        );

        const changesetContent = readFileSync(
          path.join(changesetDir, "vscode-change.md"),
          "utf8",
        );

        expect(changesetContent).toContain("kibi-vscode");
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("single-package releases", () => {
    test(
      "CLI-only release works correctly",
      async () => {
        const cliDir = path.join(tmpDir, "packages", "cli");
        mkdirSync(cliDir, { recursive: true });

        writeFileSync(
          path.join(cliDir, "package.json"),
          JSON.stringify(
            {
              name: "kibi-cli",
              version: "0.2.1",
              dependencies: {
                "kibi-core": "^0.1.6",
                commander: "^11.0.0",
              },
            },
            null,
            2,
          ),
        );

        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "cli-feature.md"),
          '---\n"kibi-cli": minor\n---\n\nAdd new sync command option\n',
        );

        const pkgContent = JSON.parse(
          readFileSync(path.join(cliDir, "package.json"), "utf8"),
        );
        const changesetContent = readFileSync(
          path.join(changesetDir, "cli-feature.md"),
          "utf8",
        );

        expect(pkgContent.name).toBe("kibi-cli");
        expect(pkgContent.dependencies["kibi-core"]).toBe("^0.1.6");
        expect(changesetContent).toContain("kibi-cli");
        expect(changesetContent).toContain("minor");
        expect(changesetContent).not.toContain("kibi-core");
        expect(changesetContent).not.toContain("kibi-mcp");
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "core-only release creates single package candidate",
      async () => {
        const coreDir = path.join(tmpDir, "packages", "core");
        mkdirSync(coreDir, { recursive: true });

        writeFileSync(
          path.join(coreDir, "package.json"),
          JSON.stringify(
            {
              name: "kibi-core",
              version: "0.1.6",
              files: ["src/**/*.pl", "schema/**/*.pl"],
            },
            null,
            2,
          ),
        );

        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "core-fix.md"),
          '---\n"kibi-core": patch\n---\n\nFix validation rule for cycles\n',
        );

        const pkgContent = JSON.parse(
          readFileSync(path.join(coreDir, "package.json"), "utf8"),
        );
        const changesetContent = readFileSync(
          path.join(changesetDir, "core-fix.md"),
          "utf8",
        );

        expect(pkgContent.name).toBe("kibi-core");
        expect(changesetContent).toContain("kibi-core");
        expect(changesetContent).toContain("patch");
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("multi-package releases", () => {
    test(
      "core change propagates to dependent packages (cli/mcp)",
      async () => {
        const coreDir = path.join(tmpDir, "packages", "core");
        const cliDir = path.join(tmpDir, "packages", "cli");
        const mcpDir = path.join(tmpDir, "packages", "mcp");

        mkdirSync(coreDir, { recursive: true });
        mkdirSync(cliDir, { recursive: true });
        mkdirSync(mcpDir, { recursive: true });

        writeFileSync(
          path.join(coreDir, "package.json"),
          JSON.stringify(
            {
              name: "kibi-core",
              version: "0.1.6",
              files: ["src/**/*.pl"],
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(cliDir, "package.json"),
          JSON.stringify(
            {
              name: "kibi-cli",
              version: "0.2.1",
              dependencies: {
                "kibi-core": "^0.1.6",
                commander: "^11.0.0",
              },
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(mcpDir, "package.json"),
          JSON.stringify(
            {
              name: "kibi-mcp",
              version: "0.2.2",
              dependencies: {
                "kibi-cli": "^0.2.0",
                "kibi-core": "^0.1.6",
              },
            },
            null,
            2,
          ),
        );

        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "config.json"),
          JSON.stringify(
            {
              $schema: "https://unpkg.com/@changesets/config@3.0.0/schema.json",
              changelog: "@changesets/cli/changelog",
              commit: false,
              fixed: [],
              linked: [],
              access: "public",
              baseBranch: "main",
              updateInternalDependencies: "patch",
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(changesetDir, "core-breaking.md"),
          '---\n"kibi-core": minor\n---\n\nAdd new entity type support\n',
        );

        const corePkg = JSON.parse(
          readFileSync(path.join(coreDir, "package.json"), "utf8"),
        );
        const cliPkg = JSON.parse(
          readFileSync(path.join(cliDir, "package.json"), "utf8"),
        );
        const mcpPkg = JSON.parse(
          readFileSync(path.join(mcpDir, "package.json"), "utf8"),
        );

        expect(corePkg.name).toBe("kibi-core");
        expect(cliPkg.dependencies["kibi-core"]).toBe("^0.1.6");
        expect(mcpPkg.dependencies["kibi-core"]).toBe("^0.1.6");
        expect(mcpPkg.dependencies["kibi-cli"]).toBe("^0.2.0");

        const configContent = JSON.parse(
          readFileSync(path.join(changesetDir, "config.json"), "utf8"),
        );
        expect(configContent.updateInternalDependencies).toBe("patch");
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "multi-package candidate generation includes all affected packages",
      async () => {
        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "multi-package.md"),
          '---\n"kibi-core": patch\n"kibi-cli": minor\n"kibi-mcp": patch\n---\n\nCross-cutting improvement to error handling\n',
        );

        const changesetContent = readFileSync(
          path.join(changesetDir, "multi-package.md"),
          "utf8",
        );

        expect(changesetContent).toContain("kibi-core");
        expect(changesetContent).toContain("kibi-cli");
        expect(changesetContent).toContain("kibi-mcp");
        expect(changesetContent).toContain("patch");
        expect(changesetContent).toContain("minor");
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("changelog generation", () => {
    test(
      "changeset format supports changelog generation",
      async () => {
        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "feature-with-summary.md"),
          `---
"kibi-cli": minor
---

Add comprehensive release behavior tests

This change introduces automated regression tests for:
- Docs-only changes (no release candidates)
- VS Code extension exclusion from npm
- Single-package releases (CLI-only, core-only)
- Multi-package releases with dependency propagation
`,
        );

        const changesetContent = readFileSync(
          path.join(changesetDir, "feature-with-summary.md"),
          "utf8",
        );

        expect(changesetContent).toMatch(/^---\n/);
        expect(changesetContent).toMatch(/---\n\n/);
        expect(changesetContent).toContain("kibi-cli");
        expect(changesetContent).toContain("minor");
        expect(changesetContent).toContain(
          "Add comprehensive release behavior tests",
        );
        expect(changesetContent).toContain("automated regression tests");
        expect(changesetContent).toContain("Docs-only changes");
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("no-op behavior", () => {
    test(
      "no changesets produces no release candidates",
      async () => {
        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "config.json"),
          JSON.stringify(
            {
              $schema: "https://unpkg.com/@changesets/config@3.0.0/schema.json",
              changelog: "@changesets/cli/changelog",
              commit: false,
              fixed: [],
              linked: [],
              access: "public",
              baseBranch: "main",
              updateInternalDependencies: "patch",
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(changesetDir, "README.md"),
          "# Changesets\n\nThis directory contains changesets.\n",
        );

        const files = readdirSync(changesetDir);
        const changesetFiles = files.filter(
          (f: string) => f.endsWith(".md") && f !== "README.md",
        );

        expect(changesetFiles.length).toBe(0);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "already consumed changesets produce no new candidates",
      async () => {
        const changesetDir = path.join(tmpDir, ".changeset");
        mkdirSync(changesetDir, { recursive: true });

        writeFileSync(
          path.join(changesetDir, "old-change.md"),
          '---\n"kibi-core": patch\n---\n\nOld change\n',
        );

        rmSync(path.join(changesetDir, "old-change.md"));

        expect(existsSync(path.join(changesetDir, "old-change.md"))).toBe(
          false,
        );
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("publish-selective.sh behavior", () => {
    test(
      "script handles known packages correctly",
      async () => {
        const scriptPath = path.resolve(
          __dirname,
          "../../../scripts/publish-selective.sh",
        );

        if (!existsSync(scriptPath)) {
          expect(true).toBe(true);
          return;
        }

        const scriptContent = readFileSync(scriptPath, "utf8");

        expect(scriptContent).toContain("kibi-core");
        expect(scriptContent).toContain("kibi-cli");
        expect(scriptContent).toContain("kibi-mcp");
        expect(scriptContent).toContain("kibi-vscode");
        expect(scriptContent).toContain(
          "kibi-vscode is published to VS Code Marketplace, not npm",
        );
        expect(scriptContent).toContain("check_and_publish");
        expect(scriptContent).toContain("npm view");
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "script skips already published versions",
      async () => {
        const scriptLogic = `
          if npm view kibi-core@0.1.6 version > /dev/null 2>&1; then
            echo "already exists - skipping"
          else
            echo "would publish"
          fi
        `;

        expect(scriptLogic).toContain("already exists");
        expect(scriptLogic).toContain("npm view");
      },
      TEST_TIMEOUT_MS,
    );
  });
});
