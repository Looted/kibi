import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { discoverBootstrap } from "../../src/operations/bootstrap/discovery.js";
import { buildActions } from "../../src/operations/bootstrap/guidance-actions.js";
import { SEARCH_HINTS_OFFER_REQUIREMENTS } from "../../src/operations/bootstrap/plugin-offers.js";
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

  // executable_for TEST-kibi-plugin-search-hints
  it("offers kibi-plugin-search-hints in replace mode once the KB holds enough requirements", async () => {
    for (let index = 0; index < SEARCH_HINTS_OFFER_REQUIREMENTS - 1; index++)
      write(
        fixture.root,
        `.kb/requirements/REQ-${String(index).padStart(3, "0")}.md`,
        `---\nid: REQ-${index}\n---\n`,
      );
    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);

    write(
      fixture.root,
      ".kb/requirements/REQ-last.md",
      "---\nid: REQ-last\n---\n",
    );
    const [offer] = (await discoverBootstrap(runtime(fixture.root)))
      .pluginOffers;
    expect(offer).toMatchObject({
      package: "kibi-plugin-search-hints",
      capability: "kibi.search-hints.v1",
      mode: "replace",
      fileCount: SEARCH_HINTS_OFFER_REQUIREMENTS,
      evidence: [
        ".kb/requirements/REQ-000.md",
        ".kb/requirements/REQ-001.md",
        ".kb/requirements/REQ-002.md",
        ".kb/requirements/REQ-003.md",
        ".kb/requirements/REQ-004.md",
      ],
    });

    setKibiConfig(fixture.root, {
      declinedPlugins: ["kibi-plugin-search-hints"],
    });
    expect(
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers,
    ).toEqual([]);
  });
  // executable_for TEST-kibi-plugin-search-hints
  it("withholds the search-hints offer at 49 requirement documents and makes it at exactly 50", async () => {
    const offered = async () =>
      (await discoverBootstrap(runtime(fixture.root))).pluginOffers.filter(
        (offer) => offer.package === "kibi-plugin-search-hints",
      );
    for (let index = 0; index < 49; index++)
      write(
        fixture.root,
        `.kb/requirements/REQ-${String(index).padStart(3, "0")}.md`,
        `---\nid: REQ-${index}\n---\n`,
      );
    // One document short of the bound: no offer.
    expect(await offered()).toEqual([]);

    write(
      fixture.root,
      ".kb/requirements/REQ-049.md",
      "---\nid: REQ-049\n---\n",
    );
    // At the bound itself the offer appears; a higher bound would miss it.
    const offers = await offered();
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      package: "kibi-plugin-search-hints",
      mode: "replace",
      fileCount: 50,
    });
  });
});
