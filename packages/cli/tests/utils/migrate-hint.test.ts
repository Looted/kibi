import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as kbManifest from "../../src/utils/kb-manifest.js";
import {
  printSchemaMigrationHint,
  schemaMigrationHint,
} from "../../src/utils/migrate-hint.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function manifest(status: unknown): void {
  const spy = spyOn(kbManifest, "readKbManifestStatus").mockReturnValue(
    status as never,
  );
  restores.push(() => spy.mockRestore());
}

describe("schema migration hint", () => {
  test("names the recorded and the expected schema and the commands", () => {
    manifest({ state: "ok", manifest: { schemaVersion: 14 } });
    expect(schemaMigrationHint("/w")).toBe(
      `Migration needed: this KB is at schema 14 and this Kibi expects schema ${LATEST_KB_SCHEMA_VERSION}. Run 'kibi migrate' to review the upgrade, then 'kibi migrate --yes' to apply it.`,
    );
  });

  test("says nothing for a current, newer, missing or broken manifest", () => {
    for (const status of [
      { state: "ok", manifest: { schemaVersion: LATEST_KB_SCHEMA_VERSION } },
      {
        state: "ok",
        manifest: { schemaVersion: LATEST_KB_SCHEMA_VERSION + 1 },
      },
      { state: "missing", manifest: null },
      { state: "invalid", manifest: null },
    ]) {
      for (const restore of restores.splice(0)) restore();
      manifest(status);
      expect(schemaMigrationHint("/w")).toBeNull();
    }
  });

  test("prints the hint and a blank line, or nothing", () => {
    const logs: string[] = [];
    const log = spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    restores.push(() => log.mockRestore());
    manifest({ state: "ok", manifest: { schemaVersion: 3 } });
    printSchemaMigrationHint("/w");
    expect(logs).toEqual([schemaMigrationHint("/w") as string, ""]);
    restores.pop()?.();
    manifest({ state: "missing", manifest: null });
    logs.length = 0;
    printSchemaMigrationHint("/w");
    expect(logs).toEqual([]);
  });
});
