import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  pluginInstallProblems,
  sourceAnalyzerInstallProblems,
} from "../../src/plugins/plugin-install-check.js";

// implements REQ-symbol-coordinates-derived-locally, REQ-cli-doctor

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** A workspace that activates the tree-sitter analyzer and a classifier plugin. */
function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-plugin-install-"));
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      devDependencies: {
        "kibi-plugin-treesitter": "2.1.0",
        "kibi-plugin-jev": "0.1.0",
      },
      kibi: {
        plugins: [
          {
            package: "kibi-plugin-treesitter",
            capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
          },
          {
            package: "kibi-plugin-jev",
            capabilities: {
              "kibi.semantic-classifier.v1": { mode: "augment" },
            },
          },
        ],
      },
    }),
  );
  return root;
}

/** A resolvable package whose files are not the release-qualified build. */
function installStub(root: string, name: string, version?: string): void {
  const dir = path.join(root, "node_modules", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, ...(version ? { version } : {}), main: "index.js" }),
  );
  writeFileSync(path.join(dir, "index.js"), "module.exports = {};\n");
}

describe("source analyzer install problems", () => {
  test("names only the symbol-extractor plugins, and each missing one", () => {
    const root = workspace();
    const problems = sourceAnalyzerInstallProblems(root);
    // kibi-plugin-jev is not a symbol extractor, so a refresh does not need it.
    expect(problems.map((row) => row.problem)).toEqual([
      "kibi-plugin-treesitter is declared but not installed",
    ]);
    expect(problems[0]?.fix).toContain(`npm install in ${root}`);
  });

  test("names the installed version of a build that is not the pinned one", () => {
    const root = workspace();
    installStub(root, "kibi-plugin-treesitter", "2.0.9");
    const [problem] = sourceAnalyzerInstallProblems(root);
    expect(problem?.problem).toStartWith(
      "installed kibi-plugin-treesitter 2.0.9 is not the release-qualified build this Kibi pins (kibi-plugin-treesitter 2.1.0: ",
    );
    expect(problem?.fix).toContain(
      "npm install --save-dev kibi-plugin-treesitter@2.1.0",
    );
  });

  test("says unknown version when the installed build names none", () => {
    const root = workspace();
    installStub(root, "kibi-plugin-treesitter");
    expect(sourceAnalyzerInstallProblems(root)[0]?.problem).toStartWith(
      "installed kibi-plugin-treesitter unknown version is not the release-qualified build",
    );
  });

  test("an installed plugin with no pinned build has no problem", () => {
    const root = workspace();
    installStub(root, "kibi-plugin-jev", "0.1.0");
    expect(pluginInstallProblems(root, ["kibi-plugin-jev"])).toEqual([]);
  });

  test("a workspace with no plugins has none", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-plugin-install-"));
    roots.push(root);
    expect(sourceAnalyzerInstallProblems(root)).toEqual([]);
  });
});
