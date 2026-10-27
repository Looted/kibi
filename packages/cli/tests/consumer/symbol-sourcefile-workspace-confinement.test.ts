// implements REQ-symbol-sourcefile-workspace-confinement
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * Public upsert must refuse absolute and `..`-escaping symbol sourceFile
 * values so coordinate refresh cannot be used as an outside-workspace file
 * oracle. The fixture drives the built CLI only.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function symbolPayload(sourceFile: string): Json {
  return {
    type: "symbol",
    id: "SYM-ESCAPE-PROBE",
    properties: {
      title: "escapeProbe",
      status: "active",
      sourceFile,
    },
    dryRun: true,
  };
}

describe("built CLI rejects outside-workspace symbol sourceFile", () => {
  test("preview write refuses absolute and ..-escaping sourceFile paths", () => {
    const ws = createConsumerWorkspace("kibi-sourcefile-confinement-");
    workspace = ws;

    const absolute = ws.json(
      ["upsert"],
      symbolPayload("/tmp/outside-secret.ts"),
    );
    expect(absolute).toMatchObject({
      status: "error",
      error: { code: "UPSERT_DRY_RUN_INVALID" },
    });
    expect(JSON.stringify(absolute)).toMatch(/workspace-relative path/);

    const escaped = ws.json(["upsert"], symbolPayload("../outside-secret.ts"));
    expect(escaped).toMatchObject({
      status: "error",
      error: { code: "UPSERT_DRY_RUN_INVALID" },
    });
    expect(JSON.stringify(escaped)).toMatch(/workspace-relative path/);
  }, 600_000);
});
