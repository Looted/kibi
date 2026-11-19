import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
} from "./workspace.js";

let ws: ConsumerWorkspace | undefined;
afterEach(() => {
  ws?.cleanup();
  ws = undefined;
});

const SOURCE = `export function expireKey(createdAt: number, now: number): boolean {
  return now - createdAt > 90 * 86_400_000;
}

export function renderKey(key: string): string {
  return key.slice(0, 4);
}

export class KeyStore {
  rotate(id: string): string {
    return id;
  }

  revoke(id: string): void {
    void id;
  }
}
`;

function requirement(implementedBy: unknown, extra: Json = {}): Json {
  return {
    type: "req",
    id: "REQ-api-key-expiry",
    properties: {
      title: "API keys expire",
      status: "open",
      priority: "must",
      semantic_text: "API keys must expire ninety days after they are created.",
    },
    implementedBy,
    ...extra,
  };
}

function workspaceWithSource(): ConsumerWorkspace {
  const workspace = createConsumerWorkspace("kibi-upsert-implemented-by-");
  ws = workspace;
  workspace.write("src/keys.ts", SOURCE);
  return workspace;
}

function symbols(workspace: ConsumerWorkspace): Json[] {
  return (
    workspace.json(["query"], { type: "symbol", fields: "full" }).data as Json
  ).entities as Json[];
}

describe("kb_upsert implementedBy through the real CLI", () => {
  test("links the named declaration from a new symbol and reuses it on the next write", () => {
    const workspace = workspaceWithSource();
    const preview = workspace.json(
      ["upsert"],
      requirement([{ sourceFile: "src/keys.ts", symbol: "expireKey" }], {
        dryRun: true,
      }),
    );
    expect(preview.status, JSON.stringify(preview.error)).toBe("success");
    expect((preview.data as Json).implementedBy).toEqual([
      {
        sourceFile: "src/keys.ts",
        symbol: "expireKey",
        symbolId: "SYM-keys-expire-key",
        created: true,
      },
    ]);
    expect(symbols(workspace)).toHaveLength(0);

    const written = workspace.json(
      ["upsert"],
      requirement([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
    );
    expect(written, JSON.stringify(written)).toMatchObject({
      status: "success",
    });
    expect((written.data as Json).implementedBy).toEqual([
      {
        sourceFile: "src/keys.ts",
        symbol: "expireKey",
        symbolId: "SYM-keys-expire-key",
        created: true,
      },
    ]);
    const manifest = workspace.read(".kb/symbols.yaml");
    expect(manifest).toContain("id: SYM-keys-expire-key");
    expect(manifest).toContain("title: expireKey");
    expect(manifest).toContain("sourceFile: src/keys.ts");
    expect(manifest).toContain("target: REQ-api-key-expiry");

    // A second requirement linking the same declaration reuses its symbol.
    const again = workspace.json(["upsert"], {
      ...requirement([{ sourceFile: "./src/keys.ts", symbol: "expireKey" }]),
      id: "REQ-api-key-expiry-audit",
      properties: {
        title: "Expired API keys are audited",
        status: "open",
        priority: "should",
        semantic_text: "An expired API key must be listed in the audit log.",
      },
    });
    expect(again, JSON.stringify(again)).toMatchObject({ status: "success" });
    expect((again.data as Json).implementedBy).toEqual([
      {
        sourceFile: "src/keys.ts",
        symbol: "expireKey",
        symbolId: "SYM-keys-expire-key",
        created: false,
      },
    ]);
    expect(symbols(workspace)).toHaveLength(1);
    // The authored manifest compiles to the same KB.
    workspace.sync();
    expect((workspace.json(["status"], {}).data as Json).syncState).toBe(
      "fresh",
    );
    const [linked] = symbols(workspace);
    expect(linked?.implements).toEqual([
      "kb:entity/REQ-api-key-expiry",
      "kb:entity/REQ-api-key-expiry-audit",
    ]);
  }, 120_000);

  test("refuses an entry that names no declaration, a coarse class or a whole file, writing nothing", () => {
    const workspace = workspaceWithSource();
    const missing = workspace.json(
      ["upsert"],
      requirement([{ sourceFile: "src/keys.ts", symbol: "expire" }]),
    );
    expect(missing.status).toBe("error");
    const missingMessage = JSON.stringify(missing.error);
    expect(missingMessage).toContain("resolves to no declaration");
    expect(missingMessage).toContain("expireKey");

    const coarse = workspace.json(
      ["upsert"],
      requirement([{ sourceFile: "src/keys.ts", symbol: "KeyStore" }]),
    );
    expect(coarse.status).toBe("error");
    const coarseMessage = JSON.stringify(coarse.error);
    expect(coarseMessage).toContain("coarse link");
    expect(coarseMessage).toContain("rotate");

    const wholeFile = workspace.json(
      ["upsert"],
      requirement([{ sourceFile: "src/keys.ts", symbol: "" }]),
    );
    expect(wholeFile.status).toBe("error");

    const notRequirement = workspace.json(["upsert"], {
      type: "scenario",
      id: "SCEN-key-expiry",
      properties: { title: "A key expires", status: "active" },
      implementedBy: [{ sourceFile: "src/keys.ts", symbol: "expireKey" }],
    });
    expect(notRequirement.status).toBe("error");
    expect(JSON.stringify(notRequirement.error)).toContain(
      "accepted only on a requirement",
    );

    expect(
      (workspace.json(["query"], { id: "REQ-api-key-expiry" }).data as Json)
        .entities,
    ).toEqual([]);
    expect(symbols(workspace)).toHaveLength(0);
  }, 120_000);
});
