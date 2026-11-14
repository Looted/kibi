import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KB_MANIFEST_VERSION,
  defaultKbManifest,
  parseKbManifest,
  readKbManifest,
  readKbManifestOrDefault,
  readKbManifestStatus,
  writeKbManifest,
} from "../../src/utils/kb-manifest.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-kb-manifest-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
function workspace(contents?: string): string {
  const dir = path.join(base, `w${counter++}`);
  mkdirSync(path.join(dir, ".kb"), { recursive: true });
  if (contents !== undefined) {
    writeFileSync(path.join(dir, ".kb", "manifest.json"), contents);
  }
  return dir;
}
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const VALID = {
  manifestVersion: 1,
  schemaVersion: 4,
  semanticAdvisorBackfill: "pending",
};
const statusOf = (value: unknown) => {
  const text = JSON.stringify(value);
  return { status: readKbManifestStatus(workspace(text)), hash: sha(text) };
};
const MALFORMED =
  "Kibi lifecycle manifest at .kb/manifest.json is malformed; re-run 'kibi init' or 'kibi migrate'.";

describe("kb manifest defaults", () => {
  test("the default names the latest schema and no backfill", () => {
    expect(KB_MANIFEST_VERSION).toBe(1);
    expect(defaultKbManifest()).toStrictEqual({
      manifestVersion: 1,
      schemaVersion: LATEST_KB_SCHEMA_VERSION,
      semanticAdvisorBackfill: "not_applicable",
    });
  });
});

describe("readKbManifestStatus", () => {
  test("a missing manifest asks for init or migrate", () => {
    expect(readKbManifestStatus(workspace())).toStrictEqual({
      state: "missing",
      manifest: null,
      manifestHash: null,
      warning:
        "Kibi lifecycle manifest is missing; run 'kibi init' or 'kibi migrate' to create it.",
    });
  });

  test("an unreadable manifest path is invalid without a hash", () => {
    const dir = workspace();
    mkdirSync(path.join(dir, ".kb", "manifest.json"));
    expect(readKbManifestStatus(dir)).toStrictEqual({
      state: "invalid",
      manifest: null,
      manifestHash: null,
      warning:
        "Kibi lifecycle manifest at .kb/manifest.json is unreadable; re-run 'kibi init'.",
    });
  });

  test("invalid JSON is reported with the content hash", () => {
    expect(readKbManifestStatus(workspace("{"))).toStrictEqual({
      state: "invalid",
      manifest: null,
      manifestHash: sha("{"),
      warning:
        "Kibi lifecycle manifest at .kb/manifest.json is not valid JSON; re-run 'kibi init'.",
    });
  });

  test("a valid manifest keeps known fields and string acknowledgements", () => {
    const value = {
      ...VALID,
      extra: true,
      contextAcknowledged: ["A", 1],
      supersedesReasonAcknowledged: ["B -> C", null],
      firmSupersedeAcknowledged: [{}, "D -> E"],
    };
    const { status, hash } = statusOf(value);
    expect<unknown>(status).toStrictEqual({
      state: "ok",
      manifestHash: hash,
      manifest: {
        ...VALID,
        contextAcknowledged: ["A"],
        supersedesReasonAcknowledged: ["B -> C"],
        firmSupersedeAcknowledged: ["D -> E"],
      },
    });
    expect<unknown>(
      statusOf({
        ...VALID,
        contextAcknowledged: "A",
        supersedesReasonAcknowledged: {},
        firmSupersedeAcknowledged: 1,
      }).status,
    ).toStrictEqual({
      state: "ok",
      manifestHash: statusOf({
        ...VALID,
        contextAcknowledged: "A",
        supersedesReasonAcknowledged: {},
        firmSupersedeAcknowledged: 1,
      }).hash,
      manifest: VALID,
    });
  });

  test("accepts every backfill state and a version below the current one", () => {
    for (const backfill of ["pending", "completed", "not_applicable"]) {
      expect<unknown>(
        statusOf({ ...VALID, semanticAdvisorBackfill: backfill }).status
          .manifest,
      ).toStrictEqual({ ...VALID, semanticAdvisorBackfill: backfill });
    }
    expect<unknown>(
      statusOf({ ...VALID, manifestVersion: 0, schemaVersion: 1 }).status
        .manifest,
    ).toStrictEqual({ ...VALID, manifestVersion: 0, schemaVersion: 1 });
  });

  test("a document that is not a valid manifest is malformed", () => {
    for (const value of [
      null,
      [VALID],
      "text",
      { ...VALID, manifestVersion: "1" },
      { ...VALID, manifestVersion: 1.5 },
      { ...VALID, manifestVersion: undefined },
      { ...VALID, schemaVersion: "4" },
      { ...VALID, schemaVersion: 4.5 },
      { ...VALID, schemaVersion: 0 },
      { ...VALID, semanticAdvisorBackfill: "done" },
      { ...VALID, manifestVersion: 2.5 },
    ]) {
      const { status, hash } = statusOf(value);
      expect(status).toStrictEqual({
        state: "invalid",
        manifest: null,
        manifestHash: hash,
        warning: MALFORMED,
      });
    }
  });

  test("a newer manifest version asks for an upgrade", () => {
    const { status, hash } = statusOf({ ...VALID, manifestVersion: 2 });
    expect(status).toStrictEqual({
      state: "future",
      manifest: null,
      manifestHash: hash,
      warning:
        "Kibi lifecycle manifest version 2 is newer than this build supports (1); upgrade kibi.",
    });
    expect(
      statusOf({ ...VALID, manifestVersion: 2, schemaVersion: "x" }).status
        .state,
    ).toBe("future");
  });
});

describe("readKbManifest and writeKbManifest", () => {
  test("readers return the manifest only when it is ok", () => {
    const ok = workspace(JSON.stringify(VALID));
    expect<unknown>(readKbManifest(ok)).toStrictEqual(VALID);
    expect<unknown>(readKbManifestOrDefault(ok)).toStrictEqual(VALID);
    const broken = workspace("{");
    expect(readKbManifest(broken)).toBeNull();
    expect(readKbManifestOrDefault(broken)).toStrictEqual(defaultKbManifest());
  });

  test("writes pretty JSON atomically, creating .kb when needed", () => {
    const dir = path.join(base, `fresh${counter++}`);
    const manifest = {
      ...VALID,
      semanticAdvisorBackfill: "completed" as const,
    };
    const written = writeKbManifest(dir, manifest);
    expect(written).toBe(path.join(dir, ".kb", "manifest.json"));
    expect(readFileSync(written, "utf8")).toBe(
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    writeKbManifest(dir, VALID as never);
    expect<unknown>(readKbManifest(dir)).toStrictEqual(VALID);
    expect(readdirSync(path.join(dir, ".kb"))).toStrictEqual(["manifest.json"]);
  });
});

describe("parseKbManifest", () => {
  test("reads manifest text such as a Git tree's copy", () => {
    expect(
      parseKbManifest(
        JSON.stringify({
          manifestVersion: 1,
          schemaVersion: 17,
          semanticAdvisorBackfill: "completed",
          positiveScenarioAcknowledged: ["REQ-a", 3],
        }),
      ),
    ).toStrictEqual({
      manifestVersion: 1,
      schemaVersion: 17,
      semanticAdvisorBackfill: "completed",
      positiveScenarioAcknowledged: ["REQ-a"],
    });
  });

  test("is null for text that is not JSON or not a manifest", () => {
    expect(parseKbManifest("{not json")).toBeNull();
    expect(parseKbManifest(JSON.stringify({ schemaVersion: 17 }))).toBeNull();
  });
});
