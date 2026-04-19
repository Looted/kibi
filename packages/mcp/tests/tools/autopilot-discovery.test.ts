import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { setupWorkspace, writeRootConfig, createVendoredTree, ensureDocs } from "./autopilot-workspace-fixture";
import { classifyActivationState, discoverSources } from "../../src/tools/autopilot-discovery";
import type { PrologProcess } from "kibi-cli/prolog";

describe("autopilot discovery", () => {
  let fixture: ReturnType<typeof setupWorkspace> | null = null;

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

    const fakeProlog = { query: async () => ({ success: true, bindings: { JsonString: '{}' } }) } as unknown as PrologProcess;
    const state = await classifyActivationState(fixture.root, fakeProlog);
    expect(state).toBe("vendored_only");

    const discovered = discoverSources(fixture.root, state);
    expect(discovered.candidates.length).toBe(0);
  });

  it("classifies root_uninitialized when no root config and no vendored tree", async () => {
    if (!fixture) throw new Error("missing fixture");
    const fakeProlog = { query: async () => ({ success: true, bindings: { JsonString: '{}' } }) } as unknown as PrologProcess;
    const state = await classifyActivationState(fixture.root, fakeProlog);
    expect(state).toBe("root_uninitialized");
  });

  it("classifies root_partial when config exists but targets missing", async () => {
    if (!fixture) throw new Error("missing fixture");
    writeRootConfig(fixture.root, { paths: { requirements: "documentation/requirements/**/*.md" } });

    const fakeProlog = { query: async () => ({ success: true, bindings: { JsonString: '{}' } }) } as unknown as PrologProcess;
    const state = await classifyActivationState(fixture.root, fakeProlog);
    expect(state).toBe("root_partial");
  });

  it("classifies root_active_seeded when KB reports seeded counts", async () => {
    if (!fixture) throw new Error("missing fixture");
    // create full documentation tree
    ensureDocs(fixture.root);
    writeRootConfig(fixture.root, {});

    // Fake Prolog returns counts meeting thresholds
    const fakeJson = JSON.stringify({ rows: [
      { id: "req", type: "req", count: 2 },
      { id: "scenario", type: "scenario", count: 1 },
      { id: "test", type: "test", count: 1 },
      { id: "adr", type: "adr", count: 1 },
      { id: "fact", type: "fact", count: 1 },
    ]});
    const fakeProlog = { query: async () => ({ success: true, bindings: { JsonString: fakeJson } }) } as unknown as PrologProcess;

    const state = await classifyActivationState(fixture.root, fakeProlog);
    expect(state).toBe("root_active_seeded");

    const discovered = discoverSources(fixture.root, state);
    // should include some documentation files
    expect(discovered.candidates.some((p) => p.includes("requirements/REQ-001.md"))).toBeTruthy();
  });

  it("classifies root_active_thin when KB reports low counts", async () => {
    if (!fixture) throw new Error("missing fixture");
    ensureDocs(fixture.root);
    writeRootConfig(fixture.root, {});

    const fakeJson = JSON.stringify({ rows: [
      { id: "req", type: "req", count: 0 },
      { id: "scenario", type: "scenario", count: 0 },
      { id: "test", type: "test", count: 0 },
    ]});
    const fakeProlog = { query: async () => ({ success: true, bindings: { JsonString: fakeJson } }) } as unknown as PrologProcess;

    const state = await classifyActivationState(fixture.root, fakeProlog);
    expect(state).toBe("root_active_thin");
  });
});
