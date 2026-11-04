import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { APPROVED_SOURCE_ANALYZERS } from "../../src/plugins/approved-source-analyzers.js";
import type { ApprovedSourceAnalyzer } from "../../src/plugins/approved-source-analyzers.js";
import {
  REFERENCE_PLUGIN_PACKAGE,
  loadProofReferenceExtractors,
  proofReferenceExtractorLoader,
  realProofReferenceExtractorLoader,
} from "../../src/plugins/proof-reference-extractors.js";

// implements REQ-kibi-tree-sitter-references

const REFS = "kibi.reference-extractor.v1";
const roots: string[] = [];
afterEach(() => {
  Object.assign(
    proofReferenceExtractorLoader,
    realProofReferenceExtractorLoader(),
  );
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(plugins: string[], other: string[] = []): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-proof-loader-"));
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "sample",
      devDependencies: Object.fromEntries(
        [...plugins, ...other].map((n) => [n, "1.0.0"]),
      ),
      kibi: {
        plugins: [
          ...plugins.map((name) => ({
            package: name,
            capabilities: { [REFS]: { mode: "augment" } },
          })),
          ...other.map((name) => ({
            package: name,
            capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
          })),
        ],
      },
    }),
  );
  return root;
}

const PLUGIN = (name: string, refs: boolean) => `export const kibiPlugin = {
  apiVersion: "kibi.plugin.v1",
  id: ${JSON.stringify(name)},
  version: "1.0.0",
  permissions: { network: false, metered: false, secrets: [] },
  capabilities: ${
    refs
      ? `{ referenceExtractor: { id: "${name}.refs", supports: () => true, extract: () => ({ references: [] }) } }`
      : `{ semanticClassifier: { id: "${name}.c", classify: () => ({ decisions: [] }) } }`
  },
};
`;

/** Install a stub provider and return the approval that qualifies its bytes. */
function install(
  root: string,
  name: string,
  options: { refs?: boolean; main?: string } = {},
): ApprovedSourceAnalyzer {
  const dir = path.join(root, "node_modules", name);
  mkdirSync(path.join(dir, "dist"), { recursive: true });
  const main = options.main ?? "dist/index.js";
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, version: "1.0.0", type: "module", main }),
  );
  writeFileSync(path.join(dir, main), PLUGIN(name, options.refs ?? true));
  writeFileSync(
    path.join(dir, "dist/index.js"),
    PLUGIN(name, options.refs ?? true),
  );
  const files: Record<string, string> = {};
  for (const file of ["package.json", "dist/index.js"]) {
    files[file] = createHash("sha256")
      .update(readFileSync(path.join(dir, file)))
      .digest("hex");
  }
  return { packageName: name, version: "1.0.0", files, dependencies: [] };
}

describe("loadProofReferenceExtractors", () => {
  test("loads each qualified provider's reference extractor", async () => {
    const root = workspace(["refs-a", "refs-b"], ["symbols-only"]);
    const approvals = [install(root, "refs-a"), install(root, "refs-b")];
    const loaded = await loadProofReferenceExtractors(root, approvals);
    expect(loaded.problems).toStrictEqual([]);
    expect(loaded.extractors.map((e) => e.id)).toStrictEqual([
      "refs-a.refs",
      "refs-b.refs",
    ]);
  });

  test("names every refused provider and keeps the usable ones", async () => {
    const root = workspace([
      "unqualified",
      "outside",
      "tampered",
      "norefs",
      "ok",
    ]);
    const outside = install(root, "outside", { main: "dist/other.js" });
    const tampered = install(root, "tampered");
    writeFileSync(
      path.join(root, "node_modules/tampered/dist/index.js"),
      PLUGIN("tampered", false),
    );
    const loaded = await loadProofReferenceExtractors(root, [
      outside,
      tampered,
      install(root, "norefs", { refs: false }),
      install(root, "ok"),
    ]);
    expect(loaded.extractors.map((e) => e.id)).toStrictEqual(["ok.refs"]);
    expect(loaded.problems).toStrictEqual([
      "unqualified is not a release-qualified reference reader",
      "outside's entrypoint is outside its qualified closure",
      "Source analyzer integrity mismatch: dist/index.js",
      "norefs 1.0.0 has no reference extractor",
    ]);
  });

  test("a provider that cannot be resolved is a problem", async () => {
    const root = workspace(["missing"]);
    const loaded = await loadProofReferenceExtractors(root, [
      { packageName: "missing", version: "1", files: {}, dependencies: [] },
    ]);
    expect(loaded.extractors).toStrictEqual([]);
    expect(loaded.problems).toHaveLength(1);
    expect(loaded.problems[0]).toContain("missing");
  });

  test("an unreadable package.json is the only problem", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-proof-loader-"));
    roots.push(root);
    writeFileSync(path.join(root, "package.json"), "[]");
    expect(await loadProofReferenceExtractors(root)).toStrictEqual({
      extractors: [],
      problems: ["package.json must be a JSON object"],
    });
  });

  test("without package.json nothing is loaded", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-proof-loader-"));
    roots.push(root);
    expect(await loadProofReferenceExtractors(root)).toStrictEqual({
      extractors: [],
      problems: [],
    });
  });

  test("checks against the release-qualified closures by default", async () => {
    const root = workspace(["refs-a"]);
    install(root, "refs-a");
    expect(await loadProofReferenceExtractors(root)).toStrictEqual({
      extractors: [],
      problems: ["refs-a is not a release-qualified reference reader"],
    });
  });
});

describe("proofReferenceExtractorLoader", () => {
  test("starts as, and is restored to, the real loader", async () => {
    const real = realProofReferenceExtractorLoader();
    expect(Object.keys(real)).toStrictEqual(["approvals", "load"]);
    expect(real.approvals).toBe(APPROVED_SOURCE_ANALYZERS);
    const root = workspace(["refs-a"]);
    install(root, "refs-a");
    expect(await real.load(root)).toStrictEqual({
      extractors: [],
      problems: ["refs-a is not a release-qualified reference reader"],
    });
  });

  test("names the suggested reference plugin", () => {
    expect(REFERENCE_PLUGIN_PACKAGE).toBe("kibi-plugin-treesitter");
  });

  test("keeps a complete load until package.json changes", async () => {
    const root = workspace(["refs-a"]);
    proofReferenceExtractorLoader.approvals = [install(root, "refs-a")];
    const first = proofReferenceExtractorLoader.load(root);
    expect((await first).extractors.map((e) => e.id)).toStrictEqual([
      "refs-a.refs",
    ]);
    await Promise.resolve();
    expect(proofReferenceExtractorLoader.load(root)).toBe(first);
    const later = new Date(Date.now() + 60_000);
    utimesSync(path.join(root, "package.json"), later, later);
    expect(proofReferenceExtractorLoader.load(root)).not.toBe(first);
  });

  test("an installed reference plugin manifest is part of the key", async () => {
    const root = workspace(["refs-a"]);
    proofReferenceExtractorLoader.approvals = [install(root, "refs-a")];
    const first = proofReferenceExtractorLoader.load(root);
    await first;
    const dir = path.join(root, "node_modules", REFERENCE_PLUGIN_PACKAGE);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "package.json"), "{}");
    const second = proofReferenceExtractorLoader.load(root);
    expect(second).not.toBe(first);
    await second;
    expect(proofReferenceExtractorLoader.load(root)).toBe(second);
    const later = new Date(Date.now() + 60_000);
    utimesSync(path.join(dir, "package.json"), later, later);
    expect(proofReferenceExtractorLoader.load(root)).not.toBe(second);
  });

  test("a load with a problem is read again", async () => {
    const root = workspace(["refs-a", "unqualified"]);
    proofReferenceExtractorLoader.approvals = [install(root, "refs-a")];
    const first = proofReferenceExtractorLoader.load(root);
    expect(proofReferenceExtractorLoader.load(root)).toBe(first);
    expect((await first).problems).toStrictEqual([
      "unqualified is not a release-qualified reference reader",
    ]);
    await Promise.resolve();
    expect(proofReferenceExtractorLoader.load(root)).not.toBe(first);
  });

  test("a load that found no provider is read again", async () => {
    const root = workspace([]);
    const first = proofReferenceExtractorLoader.load(root);
    expect(await first).toStrictEqual({ extractors: [], problems: [] });
    await Promise.resolve();
    expect(proofReferenceExtractorLoader.load(root)).not.toBe(first);
  });
});
