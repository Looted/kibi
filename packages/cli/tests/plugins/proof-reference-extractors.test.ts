import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReferenceExtractorV1 } from "kibi-plugin-sdk";
import { evaluateSourceCode } from "../../src/operations/proof/source-code-readers.js";
import { APPROVED_SOURCE_ANALYZERS } from "../../src/plugins/approved-source-analyzers.js";
import {
  loadProofReferenceExtractors,
  proofReferenceExtractorLoader,
} from "../../src/plugins/proof-reference-extractors.js";
import { type SourceSpec, readSource } from "../../src/public/proof-sources.js";

const TREESITTER = "kibi-plugin-treesitter";
const REFS = "kibi.reference-extractor.v1";

const roots: string[] = [];
const originalLoad = proofReferenceExtractorLoader.load;
afterEach(() => {
  proofReferenceExtractorLoader.load = originalLoad;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-proof-refs-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

const activated = (name: string, version: string) =>
  JSON.stringify({
    name: "sample",
    version: "1.0.0",
    private: true,
    devDependencies: { [name]: version },
    kibi: {
      plugins: [
        { package: name, capabilities: { [REFS]: { mode: "augment" } } },
      ],
    },
  });

/** Install the release-qualified kibi-plugin-treesitter closure into `root`. */
function installQualifiedTreesitter(root: string): string {
  const approval = APPROVED_SOURCE_ANALYZERS.find(
    (entry) => entry.packageName === TREESITTER,
  );
  if (!approval) throw new Error("Missing qualified Tree-sitter approval");
  const packageRoot = path.resolve(
    import.meta.dir,
    "../../../plugin-treesitter",
  );
  const installed = path.join(root, "node_modules", TREESITTER);
  for (const file of Object.keys(approval.files)) {
    mkdirSync(path.dirname(path.join(installed, file)), { recursive: true });
    copyFileSync(path.join(packageRoot, file), path.join(installed, file));
  }
  const runtime = path.dirname(
    createRequire(path.join(packageRoot, "package.json")).resolve(
      "web-tree-sitter",
    ),
  );
  symlinkSync(runtime, path.join(root, "node_modules/web-tree-sitter"), "dir");
  writeFileSync(
    path.join(root, "package.json"),
    activated(TREESITTER, approval.version),
  );
  return installed;
}

// executable_for TEST-kibi-tree-sitter-references
describe("loading proof reference extractors", () => {
  test("refuses with the config error when package.json cannot be read", async () => {
    const root = workspace({ "package.json": "{ not json" });
    const loaded = await loadProofReferenceExtractors(root);
    expect(loaded.extractors).toEqual([]);
    expect(loaded.problems).toHaveLength(1);
    expect(loaded.problems[0]).toContain("package.json");
  });

  test("loads nothing and reports nothing when no provider is activated for proofs", async () => {
    const root = workspace({
      "package.json": JSON.stringify({
        name: "sample",
        kibi: {
          plugins: [
            {
              package: TREESITTER,
              capabilities: {
                "kibi.symbol-extractor.v2": { mode: "augment" },
              },
            },
          ],
        },
      }),
    });
    expect(await loadProofReferenceExtractors(root)).toEqual({
      extractors: [],
      problems: [],
    });
  });

  test("refuses a qualified package whose entrypoint is not in its closure, before importing it", async () => {
    const root = workspace({
      "package.json": activated(TREESITTER, "2.1.0"),
      [`node_modules/${TREESITTER}/package.json`]: JSON.stringify({
        name: TREESITTER,
        version: "2.1.0",
        type: "module",
        main: "evil.js",
      }),
      [`node_modules/${TREESITTER}/evil.js`]: 'throw new Error("imported");\n',
    });
    expect(await loadProofReferenceExtractors(root)).toEqual({
      extractors: [],
      problems: [`${TREESITTER}'s entrypoint is outside its qualified closure`],
    });
  });

  test("loads the reference extractor of the qualified kibi-plugin-treesitter", async () => {
    const root = workspace({});
    installQualifiedTreesitter(root);
    const loaded = await loadProofReferenceExtractors(root);
    expect(loaded.problems).toEqual([]);
    expect(loaded.extractors).toHaveLength(1);
    expect(loaded.extractors[0]?.supports({ path: "cmd/main.go" })).toBe(true);
  });

  test("refuses a qualified provider whose plugin exposes no reference extractor", async () => {
    const root = workspace({});
    const installed = installQualifiedTreesitter(root);
    const entry = path.join(installed, "dist/index.js");
    // The bytes on disk stay the qualified ones; only what this temp
    // workspace's entry evaluates to is replaced, so nothing else sees it.
    const real = (await import(
      path.resolve(import.meta.dir, "../../../plugin-treesitter/dist/index.js")
    )) as {
      kibiPlugin: { capabilities: Record<string, unknown> } & Record<
        string,
        unknown
      >;
    };
    const { referenceExtractor: _dropped, ...capabilities } =
      real.kibiPlugin.capabilities;
    mock.module(entry, () => ({
      kibiPlugin: { ...real.kibiPlugin, capabilities },
    }));
    const loaded = await loadProofReferenceExtractors(root);
    expect(loaded.extractors).toEqual([]);
    expect(loaded.problems).toEqual([
      `${TREESITTER} ${String(real.kibiPlugin.version)} has no reference extractor`,
    ]);
  });
});

const read = (root: string, spec: Record<string, unknown>) =>
  readSource(root, spec as SourceSpec, evaluateSourceCode);

// executable_for TEST-kibi-tree-sitter-references
describe("reading Go, Java, C# and Rust references through a provider", () => {
  test("names the first three unread files, how many more, and why providers were refused", async () => {
    proofReferenceExtractorLoader.load = async () => ({
      extractors: [],
      problems: ["kibi-plugin-x is not a release-qualified reference reader"],
    });
    const root = workspace({
      "a.go": "package a\n",
      "b.go": "package b\n",
      "C.java": "class C {}\n",
      "d.cs": "class D {}\n",
      "e.rs": "fn e() {}\n",
    });
    expect(
      await read(root, { reader: "references", files: "*", extract: "calls" }),
    ).toEqual({
      ok: false,
      reason: `the references reader reads Java, Go, C#, Rust files through ${TREESITTER}, which is not active for proofs here (kibi-plugin-x is not a release-qualified reference reader); add it to devDependencies and activate ${REFS} in package.json#kibi.plugins (kibi doctor lists what this project needs): C.java, a.go, b.go and 2 more`,
    });
  });

  test("refuses a file whose provider throws, and passes callee and key through", async () => {
    const requests: unknown[] = [];
    const throwing: ReferenceExtractorV1 = {
      id: "test.throwing",
      supports: () => true,
      extract: (request) => {
        requests.push(request);
        throw new Error("grammar pack missing");
      },
    };
    proofReferenceExtractorLoader.load = async () => ({
      extractors: [throwing],
      problems: [],
    });
    const root = workspace({ "src/lib.rs": "fn main() {}\n" });
    expect(
      await read(root, {
        reader: "references",
        files: "src/*.rs",
        extract: "property",
        callee: "config",
        key: "name",
      }),
    ).toEqual({
      ok: false,
      reason: "Kibi could not read src/lib.rs: grammar pack missing",
    });
    expect(requests).toEqual([
      {
        path: "src/lib.rs",
        content: "fn main() {}\n",
        extract: "property",
        callee: "config",
        key: "name",
        timeoutMs: 10_000,
      },
    ]);

    proofReferenceExtractorLoader.load = async () => ({
      extractors: [
        {
          ...throwing,
          extract: () => {
            throw "plain failure";
          },
        },
      ],
      problems: [],
    });
    expect(
      await read(root, {
        reader: "references",
        files: "src/*.rs",
        extract: "calls",
      }),
    ).toEqual({
      ok: false,
      reason: "Kibi could not read src/lib.rs: plain failure",
    });
  });

  test("refuses a provider result that breaks the contract", async () => {
    proofReferenceExtractorLoader.load = async () => ({
      extractors: [
        {
          id: "test.broken",
          supports: () => true,
          extract: () =>
            ({ contractVersion: "wrong" }) as unknown as ReturnType<
              ReferenceExtractorV1["extract"]
            >,
        },
      ],
      problems: [],
    });
    const root = workspace({ "Main.java": "class Main {}\n" });
    const refused = await read(root, {
      reader: "references",
      files: "*.java",
      extract: "imports",
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok)
      expect(refused.reason).toStartWith("Kibi could not read Main.java: ");
  });
});
