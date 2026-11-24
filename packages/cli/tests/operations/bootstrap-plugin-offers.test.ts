import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { discoverBootstrap } from "../../src/operations/bootstrap/discovery.js";
import { buildActions } from "../../src/operations/bootstrap/guidance-actions.js";
import { normalizeBootstrapContext } from "../../src/operations/bootstrap/presentation.js";
import {
  nodeFilesystem,
  nodeGit,
} from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  type BootstrapWorkspaceFixture,
  createColdStartRepo,
  setupWorkspace,
} from "./bootstrap-workspace-fixture";

function runtime(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-09T00:00:00Z"),
    fs: {
      ...nodeFilesystem,
      readFile: async (filePath) => fs.readFileSync(filePath, "utf8"),
    },
    git: nodeGit,
  };
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function setKibiConfig(root: string, kibi: unknown): void {
  const manifestPath = path.join(root, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, kibi }));
}

// executable_for TEST-bootstrap-ui-plugin-offer
describe("bootstrap plugin offers", () => {
  let fixture: BootstrapWorkspaceFixture;

  beforeEach(() => {
    fixture = setupWorkspace();
    createColdStartRepo(fixture.root);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  // executable_for TEST-kibi-tree-sitter-references
  it("offers kibi-plugin-treesitter for Go, Java, C# and Rust sources until it reads proofs", async () => {
    write(fixture.root, "cmd/server/main.go", "package main\n");
    write(fixture.root, "src/lib.rs", "pub fn run() {}\n");
    write(fixture.root, "cmd/server/main_test.go", "package main\n");

    const { pluginOffers } = await discoverBootstrap(runtime(fixture.root));
    expect(pluginOffers).toEqual([
      {
        package: "kibi-plugin-treesitter",
        capability: "kibi.reference-extractor.v1",
        mode: "augment",
        alsoActivate: { "kibi.symbol-extractor.v2": "augment" },
        alsoInstall: ["kibi-lang-go", "kibi-lang-rust"],
        reason:
          '1 Go, 1 Rust source file(s); source proofs and symbols for them need kibi-plugin-treesitter and the grammar pack(s) kibi-lang-go, kibi-lang-rust: npm install --save-dev kibi-plugin-treesitter kibi-lang-go kibi-lang-rust, then add this entry to package.json "kibi": { "plugins": [ {"package":"kibi-plugin-treesitter","capabilities":{"kibi.reference-extractor.v1":{"mode":"augment"},"kibi.symbol-extractor.v2":{"mode":"augment"}}} ] }',
        fileCount: 2,
        evidence: ["cmd/server/main.go", "src/lib.rs"],
      },
    ]);

    // Active for symbols only: offer the proof capability alone.
    setKibiConfig(fixture.root, {
      plugins: [
        {
          package: "kibi-plugin-treesitter",
          capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
        },
      ],
    });
    const symbolsOnly = await discoverBootstrap(runtime(fixture.root));
    expect(
      symbolsOnly.pluginOffers.map((offer) => [
        offer.capability,
        offer.alsoActivate,
      ]),
    ).toEqual([["kibi.reference-extractor.v1", undefined]]);

    setKibiConfig(fixture.root, {
      plugins: [
        {
          package: "kibi-plugin-treesitter",
          capabilities: {
            "kibi.symbol-extractor.v2": { mode: "augment" },
            "kibi.reference-extractor.v1": { mode: "augment" },
          },
        },
      ],
    });
    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);
  });

  // executable_for TEST-kibi-tree-sitter-language-packs
  it("offers kibi-plugin-treesitter for symbols in a language it cannot prove", async () => {
    write(fixture.root, "src/app.py", "def run():\n    pass\n");
    write(fixture.root, "tools/build.pl", "print 1;\n");
    const { pluginOffers } = await discoverBootstrap(runtime(fixture.root));
    expect(pluginOffers).toMatchObject([
      {
        package: "kibi-plugin-treesitter",
        capability: "kibi.symbol-extractor.v2",
        mode: "augment",
        alsoInstall: ["kibi-lang-python"],
        evidence: ["src/app.py"],
      },
    ]);
  });

  it("offers kibi-plugin-ui when production component files exist", async () => {
    write(
      fixture.root,
      "src/feed/ActivityFeed.tsx",
      "export function ActivityFeed() {}\n",
    );
    write(
      fixture.root,
      "src/app/item-list.component.ts",
      "export class ItemListComponent {}\n",
    );
    write(
      fixture.root,
      "src/feed/ActivityFeed.test.tsx",
      "test('x', () => {});\n",
    );

    const { pluginOffers } = await discoverBootstrap(runtime(fixture.root));

    expect(pluginOffers).toEqual([
      {
        package: "kibi-plugin-ui",
        capability: "kibi.check-policy.v1",
        mode: "augment",
        reason: "2 UI component file(s) found",
        fileCount: 2,
        evidence: [
          "src/app/item-list.component.ts",
          "src/feed/ActivityFeed.tsx",
        ],
      },
    ]);
  });

  it("makes no offer for a workspace without components", async () => {
    write(
      fixture.root,
      "src/feed/ActivityFeed.stories.tsx",
      "export default {};\n",
    );

    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);
  });

  it("stops offering once the project declined or activated the plugin", async () => {
    write(
      fixture.root,
      "src/feed/ActivityFeed.tsx",
      "export function ActivityFeed() {}\n",
    );

    setKibiConfig(fixture.root, { declinedPlugins: ["kibi-plugin-ui"] });
    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);

    setKibiConfig(fixture.root, {
      plugins: [
        {
          package: "kibi-plugin-ui",
          capabilities: { "kibi.check-policy.v1": { mode: "augment" } },
        },
      ],
    });
    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);
  });

  it("turns an offer into a recommended action that says how to accept or decline", () => {
    const actions = buildActions(
      fixture.root,
      {
        activationState: "root_uninitialized",
        activationMode: "cold_start_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: true,
        reason: "cold start",
      },
      normalizeBootstrapContext(undefined),
      [],
      [],
      [
        {
          package: "kibi-plugin-ui",
          capability: "kibi.check-policy.v1",
          mode: "augment",
          reason: "1 UI component file(s) found",
          fileCount: 1,
          evidence: ["src/feed/ActivityFeed.tsx"],
        },
      ],
    );
    const offer = actions.find((action) => action.kind === "plugin_offer");
    expect(offer).toMatchObject({
      package: "kibi-plugin-ui",
      evidence: ["src/feed/ActivityFeed.tsx"],
    });
    expect(String(offer?.description)).toContain("kibi.declinedPlugins");
    expect(String(offer?.description)).toContain('{ "mode": "augment" }');
    expect(actions.at(-1)?.kind).toBe("check");
  });

  // executable_for TEST-kibi-tree-sitter-language-packs
  it("names the grammar packs to install next to the plugin in the action", () => {
    const actions = buildActions(
      fixture.root,
      {
        activationState: "root_uninitialized",
        activationMode: "cold_start_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: true,
        reason: "cold start",
      },
      normalizeBootstrapContext(undefined),
      [],
      [],
      [
        {
          package: "kibi-plugin-treesitter",
          capability: "kibi.reference-extractor.v1",
          mode: "augment",
          alsoActivate: { "kibi.symbol-extractor.v2": "augment" },
          alsoInstall: ["kibi-lang-go"],
          reason: "1 Go source file(s) found",
          fileCount: 1,
          evidence: ["cmd/main.go"],
        },
      ],
    );
    const offer = actions.find((action) => action.kind === "plugin_offer");
    expect(offer).toMatchObject({ alsoInstall: ["kibi-lang-go"] });
    expect(String(offer?.description)).toContain(
      "install it and kibi-lang-go as dev dependencies",
    );
  });

  // executable_for TEST-kibi-plugin-search-hints
  it("never offers kibi-plugin-search-hints, which is bundled and active", async () => {
    for (let index = 0; index < 60; index++)
      write(
        fixture.root,
        `.kb/requirements/REQ-${String(index).padStart(3, "0")}.md`,
        `---\nid: REQ-${index}\n---\n`,
      );
    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);
  });
});
