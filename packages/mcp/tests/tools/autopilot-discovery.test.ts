import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  createColdStartRepo,
  createMultiRootRepo,
  createNoisyRepo,
  createPartialRepo,
  createSeededRepo,
  createThinRepo,
  createVendoredTree,
  setupWorkspace,
} from "./autopilot-workspace-fixture";
import {
  classifyActivationState,
  discoverSources,
  resolveActivationPolicy,
} from "../../src/tools/autopilot-discovery";
import type { PrologProcess } from "kibi-cli/prolog";

describe("autopilot discovery", () => {
  let fixture: ReturnType<typeof setupWorkspace> | null = null;

  function summaryExtras(summary: unknown): {
    activationMode?: string;
    handoffMessage?: string;
    reason?: string;
  } {
    return summary as {
      activationMode?: string;
      handoffMessage?: string;
      reason?: string;
    };
  }

  function createPrologStub(json: string): PrologProcess {
    return {
      query: async () => ({
        success: true,
        bindings: { JsonString: json },
      }),
    } as unknown as PrologProcess;
  }

  function createEmptyPrologStub(): PrologProcess {
    return createPrologStub(JSON.stringify({ rows: [] }));
  }

  beforeEach(() => {
    fixture = setupWorkspace();
  });

  afterEach(() => {
    if (fixture) {
      fixture.cleanup();
      fixture = null;
    }
  });

  it("classifies vendored_only when no root config and vendored tree exists", async () => {
    if (!fixture) throw new Error("missing fixture");
    createVendoredTree(fixture.root);

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("vendored_only");
    expect(activation.activationMode).toBe("vendored_blocked");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(discovered.candidates.length).toBe(0);
    expect(summary.reason?.toLowerCase()).toContain("vendored");
  });

  it("maps root_uninitialized to cold_start_bootstrap and scans full evidence without noisy dirs", async () => {
    if (!fixture) throw new Error("missing fixture");
    createColdStartRepo(fixture.root);
    createNoisyRepo(fixture.root);
    fs.mkdirSync(path.join(fixture.root, "packages", "app", "docs"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(fixture.root, "README.md"), "# ADR: Bootstrap\n");
    fs.writeFileSync(
      path.join(fixture.root, "packages", "app", "docs", "overview.md"),
      "# Requirements\n",
    );

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_uninitialized");
    expect(activation.activationMode).toBe("cold_start_bootstrap");
    expect(activation.applyBlocked).toBe(false);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(summary.activationMode).toBe("cold_start_bootstrap");
    expect(discovered.candidates).toContain("README.md");
    expect(discovered.candidates).toContain("packages/app/docs/overview.md");
    expect(discovered.candidates).not.toContain("vendor/README.md");
  });

  it("maps root_partial to repair_bootstrap and keeps discovery review-only", async () => {
    if (!fixture) throw new Error("missing fixture");
    createPartialRepo(fixture.root);

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_partial");
    expect(activation.activationMode).toBe("repair_bootstrap");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(summary.activationMode).toBe("repair_bootstrap");
    expect(discovered.candidates).toContain(
      "documentation/requirements/REQ-PARTIAL-001.md",
    );
    expect(discovered.candidates).toContain("docs/bootstrap.md");
  });

  it("maps root_active_thin to explicit thin handoff for noisy multi-root repos", async () => {
    if (!fixture) throw new Error("missing fixture");
    createThinRepo(fixture.root, { multiRoot: true, noisy: true });

    const fakeProlog = createPrologStub(
      JSON.stringify({
        rows: [
          { id: "req", type: "req", count: 1 },
          { id: "scenario", type: "scenario", count: 0 },
          { id: "test", type: "test", count: 0 },
        ],
      }),
    );

    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_active_thin");
    expect(activation.activationMode).toBe("attached_thin_handoff");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(discovered.candidates).toEqual([]);
    expect(summary.handoffMessage?.toLowerCase()).toContain("thin");
  });

  it("maps root_active_seeded to explicit seeded handoff", async () => {
    if (!fixture) throw new Error("missing fixture");
    createSeededRepo(fixture.root);

    const fakeProlog = createPrologStub(
      JSON.stringify({
        rows: [
          { id: "req", type: "req", count: 2 },
          { id: "scenario", type: "scenario", count: 1 },
          { id: "test", type: "test", count: 1 },
          { id: "adr", type: "adr", count: 1 },
          { id: "fact", type: "fact", count: 1 },
        ],
      }),
    );

    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_active_seeded");
    expect(activation.activationMode).toBe("attached_seeded_handoff");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(discovered.candidates).toEqual([]);
    expect(summary.reason?.toLowerCase()).toContain("seeded");
  });

  it("respects .gitignore and shared denylist when discovering markdown", async () => {
    if (!fixture) throw new Error("missing fixture");

    // Create standard docs and a few ignored/secret files
    // ensureDocs creates documentation/requirements etc.
    setupWorkspace(); // no-op for typing; ensure fixture present
    // create docs
    // use helper to ensure docs structure
    // The fixture helpers expose ensureDocs via import file; call createThinRepo to populate docs
    // createThinRepo writes documentation and root config; we prefer minimal docs without root .kb
    // Use ensureDir + write files directly
    fs.mkdirSync(path.join(fixture.root, "documentation", "requirements"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture.root, "documentation", "requirements", "REQ-KEEP.md"),
      [
        "---",
        "id: REQ-KEEP",
        "title: Keep",
        "status: open",
        "---",
        "# Keep",
        "",
      ].join("\n"),
    );

    // create a gitignored private doc
    fs.mkdirSync(path.join(fixture.root, "documentation", "private"), { recursive: true });
    fs.writeFileSync(path.join(fixture.root, "documentation", "private", "SECRET.md"), "# secret\n");

    // create a .sisyphus draft which should be hard-denied
    fs.mkdirSync(path.join(fixture.root, ".sisyphus", "drafts"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture.root, ".sisyphus", "drafts", "kibi-kb-quality-audit.md"),
      "# draft\n",
    );

    // write .gitignore to ignore private docs
    fs.writeFileSync(path.join(fixture.root, ".gitignore"), "documentation/private/*.md\n");

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_uninitialized");
    expect(activation.activationMode).toBe("cold_start_bootstrap");

    const discovered = discoverSources(fixture.root, activation);
    // Keep doc should be discovered
    expect(discovered.candidates).toContain("documentation/requirements/REQ-KEEP.md");
    // Gitignored private doc should NOT be discovered
    expect(discovered.candidates).not.toContain("documentation/private/SECRET.md");
    // .sisyphus drafts should be excluded by hard denylist
    expect(discovered.candidates).not.toContain(".sisyphus/drafts/kibi-kb-quality-audit.md");
  });
});
