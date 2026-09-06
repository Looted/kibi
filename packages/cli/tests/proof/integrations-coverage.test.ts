// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PROOF_INTEGRATION_VERSION } from "../../src/public/proof-protocol.js";
import {
  loadProofIntegrations,
  proofIntegrationErrors,
  resolveIntegration,
  toExecution,
} from "../../src/proof/integrations.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-integrations-"));
  tempDirs.push(dir);
  return dir;
}

const valid = {
  version: PROOF_INTEGRATION_VERSION,
  integrations: [
    {
      id: "self-proof",
      producer: "command",
      producer_version: "1.0.0",
      command: ["node", "scripts/run-proof-producer.mjs"],
      artifact: "unused.xml",
      targets: ["default"],
      options: { timeout_ms: 1000 },
      description: "repo self-proof",
    },
  ],
};

describe("proof integrations loader", () => {
  test("rejects non-objects, bad versions, and empty integration lists", () => {
    expect(proofIntegrationErrors(null)).toEqual([
      ".kb/proof/integrations.json must be an object with version and integrations",
    ]);
    expect(proofIntegrationErrors([])).toEqual([
      ".kb/proof/integrations.json must be an object with version and integrations",
    ]);
    expect(
      proofIntegrationErrors({ version: "wrong", integrations: [] }),
    ).toEqual([
      `version must be ${PROOF_INTEGRATION_VERSION}; received "wrong"`,
      "integrations must be a non-empty array",
    ]);
  });

  test("validates integration rows and duplicate ids", () => {
    const errors = proofIntegrationErrors({
      version: PROOF_INTEGRATION_VERSION,
      integrations: [
        "bad",
        {
          id: "  ",
          producer: "",
          command: [],
          targets: [],
          options: [],
          description: "",
        },
        {
          id: "junit-one",
          producer: "junit",
          command: ["echo"],
        },
        {
          id: "junit-one",
          producer: "tap",
          command: ["echo"],
        },
      ],
    });
    expect(errors.some((error) => error.includes("must be an object"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes(".id must be a non-empty"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("duplicates"))).toBe(true);
    expect(errors.some((error) => error.includes("artifact is required"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("command must be"))).toBe(true);
    expect(errors.some((error) => error.includes("targets must be"))).toBe(true);
    expect(errors.some((error) => error.includes("options must be"))).toBe(true);
    expect(errors.some((error) => error.includes("description must be"))).toBe(
      true,
    );
  });

  test("loads missing, invalid, and valid integration files", () => {
    const missing = tempRoot();
    const missingResult = loadProofIntegrations(missing);
    expect(missingResult.available).toBe(false);
    if (!missingResult.available) {
      expect(missingResult.error).toContain("No proof integration");
    }

    const invalid = tempRoot();
    mkdirSync(path.join(invalid, ".kb", "proof"), { recursive: true });
    writeFileSync(
      path.join(invalid, ".kb", "proof", "integrations.json"),
      "{not-json",
    );
    const invalidJson = loadProofIntegrations(invalid);
    expect(invalidJson.available).toBe(false);
    if (!invalidJson.available) {
      expect(invalidJson.error).toContain("not valid JSON");
    }

    writeFileSync(
      path.join(invalid, ".kb", "proof", "integrations.json"),
      JSON.stringify({ version: "nope", integrations: [{ id: "x" }] }),
    );
    const invalidShape = loadProofIntegrations(invalid);
    expect(invalidShape.available).toBe(false);
    if (!invalidShape.available) {
      expect(invalidShape.error).toContain("Invalid");
    }

    const ok = tempRoot();
    mkdirSync(path.join(ok, ".kb", "proof"), { recursive: true });
    writeFileSync(
      path.join(ok, ".kb", "proof", "integrations.json"),
      JSON.stringify(valid),
    );
    const loaded = loadProofIntegrations(ok);
    expect(loaded.available).toBe(true);
    if (!loaded.available) return;
    expect(resolveIntegration(loaded.integrations, "missing")).toBeNull();
    const integration = resolveIntegration(loaded.integrations, "self-proof");
    expect(integration?.id).toBe("self-proof");
    expect(toExecution(integration!)).toEqual({
      id: "self-proof",
      producer: "command",
      producer_version: "1.0.0",
      command: ["node", "scripts/run-proof-producer.mjs"],
      artifact: "unused.xml",
      targets: ["default"],
      options: { timeout_ms: 1000 },
    });
  });
});
