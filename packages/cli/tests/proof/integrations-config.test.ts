import { afterAll, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PRODUCER_KINDS,
  PROOF_INTEGRATIONS_PATH,
  PROOF_RUNS_DIR,
  type ProofIntegrationsFile,
  integrationsPath,
  loadProofIntegrations,
  proofIntegrationErrors,
  resolveIntegration,
  toExecution,
} from "../../src/proof/integrations.js";

const base = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-proof-int-"));
afterAll(() => fs.rmSync(base, { recursive: true, force: true }));
let counter = 0;
function workspace(content?: string): string {
  const root = path.join(base, `w${counter++}`);
  fs.mkdirSync(path.join(root, ".kb", "proof"), { recursive: true });
  if (content !== undefined) fs.writeFileSync(integrationsPath(root), content);
  return root;
}

const VERSION = "kibi.proof-integration.v1";
const file = (...integrations: unknown[]) => ({
  version: VERSION,
  integrations,
});
const ok = { id: "unit", producer: "command", command: ["bun", "test"] };
const errorsFor = (entry: Record<string, unknown>) =>
  proofIntegrationErrors(file({ ...ok, ...entry }));

describe("proof integration locations", () => {
  test("configuration and runs live under .kb/proof", () => {
    expect(PROOF_INTEGRATIONS_PATH).toBe(".kb/proof/integrations.json");
    expect(PROOF_RUNS_DIR).toBe(".kb/proof/runs");
    expect(integrationsPath("/w")).toBe("/w/.kb/proof/integrations.json");
    expect(PRODUCER_KINDS).toEqual(["command", "playwright", "junit", "tap"]);
  });
});

describe("proofIntegrationErrors", () => {
  test("a valid file has no errors", () => {
    expect(proofIntegrationErrors(file(ok))).toEqual([]);
    expect(
      proofIntegrationErrors(
        file(
          ok,
          {
            id: "j",
            producer: "junit",
            command: ["x"],
            artifact: "r.xml",
            targets: ["a"],
            options: {},
            description: "d",
          },
          { id: "t", producer: "tap", command: ["y"], artifact: "r.tap" },
          { id: "custom", producer: "my-producer", command: ["z"] },
        ),
      ),
    ).toEqual([]);
  });

  test("the document must be an object", () => {
    for (const value of [null, [], "x", 1, undefined]) {
      expect(proofIntegrationErrors(value)).toEqual([
        ".kb/proof/integrations.json must be an object with version and integrations",
      ]);
    }
  });

  test("the version and a non-empty integration list are required", () => {
    expect(proofIntegrationErrors({ integrations: [ok] })).toEqual([
      `version must be ${VERSION}; received null`,
    ]);
    expect(proofIntegrationErrors({ version: 2, integrations: [ok] })).toEqual([
      `version must be ${VERSION}; received 2`,
    ]);
    for (const integrations of [undefined, {}, []]) {
      expect(proofIntegrationErrors({ version: "v0", integrations })).toEqual([
        `version must be ${VERSION}; received "v0"`,
        "integrations must be a non-empty array",
      ]);
    }
  });

  test("each entry must be an object with a unique id", () => {
    expect(proofIntegrationErrors(file(ok, null, [], ok))).toEqual([
      "integrations[1] must be an object",
      "integrations[2] must be an object",
      "integrations[3].id duplicates 'unit'",
    ]);
    for (const id of [undefined, "", "  ", 5]) {
      expect(errorsFor({ id })).toEqual([
        "integrations[0].id must be a non-empty string",
      ]);
    }
  });

  test("a producer and an argv command are required", () => {
    expect(errorsFor({ producer: " " })).toEqual([
      "integrations[0].producer must be one of: command, playwright, junit, tap (or a custom producer id)",
    ]);
    for (const command of [
      undefined,
      "bun test",
      [],
      ["bun", ""],
      ["bun", 1],
    ]) {
      expect(errorsFor({ command })).toEqual([
        "integrations[0].command must be a non-empty argv array",
      ]);
    }
  });

  test("junit and tap producers need the native report artifact", () => {
    for (const producer of ["junit", "tap"]) {
      for (const artifact of [undefined, "", " "]) {
        expect(errorsFor({ producer, artifact })).toEqual([
          `integrations[0].artifact is required for producer '${producer}' (path of the native report to convert)`,
        ]);
      }
    }
    expect(errorsFor({ producer: "playwright" })).toEqual([]);
  });

  test("optional targets, options and description are checked when present", () => {
    for (const targets of ["a", [], ["a", ""]]) {
      expect(errorsFor({ targets })).toEqual([
        "integrations[0].targets must be a non-empty array of target names",
      ]);
    }
    for (const options of [null, [], "x"]) {
      expect(errorsFor({ options })).toEqual([
        "integrations[0].options must be an object when present",
      ]);
    }
    for (const description of ["", " ", 1]) {
      expect(errorsFor({ description })).toEqual([
        "integrations[0].description must be a non-empty string when present",
      ]);
    }
  });
});

describe("loadProofIntegrations", () => {
  test("a missing configuration names how to create one", () => {
    expect(loadProofIntegrations(workspace())).toEqual({
      available: false,
      error:
        "No proof integration configuration at .kb/proof/integrations.json. Run kibi proof inspect --json and apply its integrationPlan with kb_apply_plan to configure one.",
    });
  });

  test("invalid JSON and invalid content are reported", () => {
    const broken = loadProofIntegrations(workspace("{"));
    expect(broken.available).toBe(false);
    expect((broken as { error: string }).error).toStartWith(
      ".kb/proof/integrations.json is not valid JSON: JSON Parse error",
    );
    expect(
      loadProofIntegrations(workspace(JSON.stringify({ version: VERSION }))),
    ).toEqual({
      available: false,
      error:
        "Invalid .kb/proof/integrations.json: integrations must be a non-empty array",
    });
    expect(
      loadProofIntegrations(
        workspace(JSON.stringify({ version: 1, integrations: [null] })),
      ),
    ).toEqual({
      available: false,
      error: `Invalid .kb/proof/integrations.json: version must be ${VERSION}; received 1; integrations[0] must be an object`,
    });
  });

  test("a non-Error read failure is reported as its string form", () => {
    const root = workspace("{}");
    const read = spyOn(fs, "readFileSync").mockImplementation(() => {
      throw "denied";
    });
    try {
      expect(loadProofIntegrations(root)).toEqual({
        available: false,
        error: ".kb/proof/integrations.json is not valid JSON: denied",
      });
    } finally {
      read.mockRestore();
    }
  });

  test("a valid configuration loads as written", () => {
    const content = file(ok);
    expect(loadProofIntegrations(workspace(JSON.stringify(content)))).toEqual({
      available: true,
      integrations: content as ProofIntegrationsFile,
    });
  });
});

describe("resolveIntegration and toExecution", () => {
  const integrations = file(ok, {
    ...ok,
    id: "other",
  }) as ProofIntegrationsFile;

  test("integrations resolve by id", () => {
    expect(resolveIntegration(integrations, "other")).toBe(
      integrations.integrations[1] as never,
    );
    expect(resolveIntegration(integrations, "missing")).toBeNull();
  });

  test("the execution keeps only the run fields that are set", () => {
    expect(toExecution({ ...ok, description: "not run" })).toStrictEqual({
      id: "unit",
      producer: "command",
      command: ["bun", "test"],
    });
    expect(
      toExecution({
        ...ok,
        producer_version: "2",
        artifact: "a.xml",
        targets: ["t"],
        options: { k: 1 },
      }),
    ).toStrictEqual({
      id: "unit",
      producer: "command",
      producer_version: "2",
      command: ["bun", "test"],
      artifact: "a.xml",
      targets: ["t"],
      options: { k: 1 },
    });
  });
});
