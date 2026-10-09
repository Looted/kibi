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
    expect(actions.at(-1)?.kind).toBe("check");
  });
});
