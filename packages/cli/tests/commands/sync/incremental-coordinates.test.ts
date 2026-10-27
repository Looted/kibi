import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { refreshManifestCoordinates } from "../../../src/commands/sync/manifest.js";
import { enrichSymbolCoordinates } from "../../../src/extractors/symbols-coordinator.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function write(root: string, file: string, content: string): void {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

const MANIFEST = `symbols:
  - id: SYM-alpha
    title: alpha
    sourceFile: src/alpha.ts
  - id: SYM-beta
    title: beta
    sourceFile: src/beta.ts
`;

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-incremental-coords-"));
  dirs.push(root);
  write(root, "src/alpha.ts", "export function alpha() {\n  return 1;\n}\n");
  write(root, "src/beta.ts", "export function beta() {\n  return 2;\n}\n");
  write(root, ".kb/symbols.yaml", MANIFEST);
  return root;
}

/** Runs an incremental refresh and records which symbols were extracted. */
async function incremental(root: string) {
  const extracted: string[] = [];
  const result = await refreshManifestCoordinates(
    path.join(root, ".kb/symbols.yaml"),
    root,
    {
      incremental: true,
      quiet: true,
      enrichSymbolCoordinates: async (entries, workspaceRoot, deps) => {
        extracted.push(...entries.map((entry) => String(entry.id)));
        return enrichSymbolCoordinates(entries, workspaceRoot, deps);
      },
    },
  );
  return { ...result, extracted: extracted.sort() };
}

function coordinates(root: string): Record<string, { sourceLine: number }> {
  const artifact = parseYAML(
    readFileSync(path.join(root, ".kb/symbol-coordinates.yaml"), "utf8"),
  ) as { coordinates: Record<string, { sourceLine: number }> };
  return artifact.coordinates;
}

describe("incremental symbol coordinate refresh", () => {
  test("builds a missing artifact, then reuses every record whose source is unchanged", async () => {
    const root = workspace();

    const first = await incremental(root);
    expect(first.artifactChanged).toBe(true);
    expect(first.extracted).toEqual(["SYM-alpha", "SYM-beta"]);
    const bytes = readFileSync(
      path.join(root, ".kb/symbol-coordinates.yaml"),
      "utf8",
    );

    const second = await incremental(root);
    expect(second).toEqual({ artifactChanged: false, extracted: [] });
    expect(
      readFileSync(path.join(root, ".kb/symbol-coordinates.yaml"), "utf8"),
    ).toBe(bytes);
  });

  test("re-extracts only the symbols whose source file changed", async () => {
    const root = workspace();
    await incremental(root);
    write(
      root,
      "src/alpha.ts",
      "// moved down\n\nexport function alpha() {\n  return 1;\n}\n",
    );

    const result = await incremental(root);
    expect(result).toEqual({ artifactChanged: true, extracted: ["SYM-alpha"] });
    expect(coordinates(root)["SYM-alpha"]?.sourceLine).toBe(3);
    expect(coordinates(root)["SYM-beta"]?.sourceLine).toBe(1);
  });

  test("matches a full refresh byte for byte", async () => {
    const root = workspace();
    await incremental(root);
    write(root, "src/beta.ts", "\nexport function beta() {\n  return 2;\n}\n");
    await incremental(root);
    const incrementalBytes = readFileSync(
      path.join(root, ".kb/symbol-coordinates.yaml"),
      "utf8",
    );

    rmSync(path.join(root, ".kb/symbol-coordinates.yaml"));
    await refreshManifestCoordinates(
      path.join(root, ".kb/symbols.yaml"),
      root,
      {
        refreshSymbolCoordinates: true,
        quiet: true,
      },
    );
    expect(
      readFileSync(path.join(root, ".kb/symbol-coordinates.yaml"), "utf8"),
    ).toBe(incrementalBytes);
  });

  test("re-extracts a symbol whose identity changed and drops removed symbols", async () => {
    const root = workspace();
    await incremental(root);
    write(
      root,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-alpha
    title: alpha
    sourceFile: src/alpha.ts
    granularity_reason: legacy-link
`,
    );

    const result = await incremental(root);
    expect(result).toEqual({ artifactChanged: true, extracted: ["SYM-alpha"] });
    expect(Object.keys(coordinates(root))).toEqual(["SYM-alpha"]);
  });

  test("rebuilds a damaged artifact instead of refusing", async () => {
    const root = workspace();
    write(root, ".kb/symbol-coordinates.yaml", "version: [\n");

    const result = await incremental(root);
    expect(result.artifactChanged).toBe(true);
    expect(result.extracted).toEqual(["SYM-alpha", "SYM-beta"]);
    expect(Object.keys(coordinates(root))).toEqual(["SYM-alpha", "SYM-beta"]);
  });

  test("never rewrites the authored manifest", async () => {
    const root = workspace();
    write(root, ".kb/symbols.yaml", `# a comment sync must keep\n${MANIFEST}`);

    await incremental(root);
    expect(readFileSync(path.join(root, ".kb/symbols.yaml"), "utf8")).toBe(
      `# a comment sync must keep\n${MANIFEST}`,
    );
  });
});
