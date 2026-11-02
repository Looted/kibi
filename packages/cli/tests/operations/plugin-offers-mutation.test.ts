// executable_for TEST-kibi-tree-sitter-references
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pluginOffers } from "../../src/operations/bootstrap/plugin-offers.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function workspace(kibi: unknown, files: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-plugin-offers-"));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "sample", private: true, kibi }),
  );
  for (const [relative, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), content);
  }
  return root;
}

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-09T00:00:00Z"),
    fs: {
      ...nodeFilesystem,
      readFile: async (filePath) => fs.readFileSync(filePath, "utf8"),
    },
  } as OperationContext;
}

const SOURCES = { "cmd/a.go": "package main\n", "lib/b.rb": "puts 1\n" };

describe("the reference plugin offer reads the kibi block's pack lists", () => {
  it("leaves out a declined pack's files and ignores a declined list that is not a list", async () => {
    const files = Object.keys(SOURCES);
    const declined = workspace(
      { declinedLanguagePacks: ["kibi-lang-ruby", 7] },
      SOURCES,
    );
    const [offer] = await pluginOffers(context(declined), files);
    expect(offer?.alsoInstall).toEqual(["kibi-lang-go"]);
    expect(offer?.evidence).toEqual(["cmd/a.go"]);

    const notAList = workspace({ declinedLanguagePacks: 5 }, SOURCES);
    const [full] = await pluginOffers(context(notAList), files);
    expect(full?.alsoInstall).toEqual(["kibi-lang-go", "kibi-lang-ruby"]);
  });

  it("leaves out files the project lists as generated, and ignores generatedPaths that is not a list", async () => {
    const files = ["gen/a.go", "lib/b.rb"];
    const sources = { "gen/a.go": "package gen\n", "lib/b.rb": "puts 1\n" };
    const listed = workspace({ generatedPaths: ["gen/**", 3] }, sources);
    const [offer] = await pluginOffers(context(listed), files);
    expect(offer?.evidence).toEqual(["lib/b.rb"]);

    const notAList = workspace({ generatedPaths: "gen/**" }, sources);
    const [full] = await pluginOffers(context(notAList), files);
    expect(full?.evidence).toEqual(["gen/a.go", "lib/b.rb"]);
  });
});
