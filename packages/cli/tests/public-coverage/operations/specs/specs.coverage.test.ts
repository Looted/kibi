import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as orchestration from "../../../../src/operations/semantic-advisor/plugin-orchestration.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import {
  dispatchComposite,
  foreignParameterWarnings,
  skillsSpec,
} from "../../../../src/public/operations/specs/composite.js";
import { executeCoverage } from "../../../../src/public/operations/specs/reporting.js";
import { executeSemanticAdvisor } from "../../../../src/public/operations/specs/semantic.js";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function context(): OperationContext {
  const root = mkdtempSync(join(tmpdir(), "kibi-specs-cov-"));
  roots.push(root);
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date(0),
  } as unknown as OperationContext;
}

const stamp = {
  pluginId: "shadow-plugin",
  pluginVersion: "1.0.0",
  capability: "semantic-classifier",
  mode: "shadow",
  external: false,
  network: false,
  metered: false,
};

describe("executeSemanticAdvisor capability plugins", () => {
  test("reports shadow classifier comparisons and ontology shadow matches", async () => {
    const real = orchestration.analyzeSemanticAdvisorInputWithPlugins;
    const spy = spyOn(
      orchestration,
      "analyzeSemanticAdvisorInputWithPlugins",
    ).mockImplementation(async (...args: Parameters<typeof real>) => {
      const orchestrated = await real(...args);
      return {
        ...orchestrated,
        classification: {
          fallbackUsed: false,
          decisions: [],
          shadowComparisons: [
            {
              stamp,
              decisions: [
                {
                  claimKey: "CLAIM-1",
                  lane: "normative",
                  confidence: 0.9,
                  extra: "dropped",
                },
              ],
            },
          ],
        },
        ontologyShadowMatches: [
          {
            packId: "pack",
            schemaId: "FACT-SCHEMA-1",
            predicateName: "rule",
            confidence: 0.5,
            extra: "dropped",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof real>>;
    });
    spies.push(spy);
    const result = await executeSemanticAdvisor(
      { text: "The system must log every login." },
      context(),
    );
    const plugins = (
      result.structuredContent as unknown as {
        capabilityPlugins: {
          classification: { shadowComparisons: unknown[] };
          ontology: { shadowMatches: unknown[] };
        };
      }
    ).capabilityPlugins;
    expect(plugins.classification.shadowComparisons).toStrictEqual([
      {
        ...stamp,
        decisions: [
          { claimKey: "CLAIM-1", lane: "normative", confidence: 0.9 },
        ],
      },
    ]);
    expect(plugins.ontology.shadowMatches).toStrictEqual([
      {
        packId: "pack",
        schemaId: "FACT-SCHEMA-1",
        predicateName: "rule",
        confidence: 0.5,
      },
    ]);
  });
});

describe("executeCoverage status filter", () => {
  test("an unknown status is refused", async () => {
    await expect(
      executeCoverage({ statuses: ["tested", "flaky"] }, context()),
    ).rejects.toThrow(
      "Invalid coverage status 'flaky'. Valid statuses: tested, missing, unresolved, not_applicable.",
    );
  });
});

describe("composite dispatch", () => {
  const routes = {
    bare: {
      businessInputSchema: {},
      execute: async () => ({ ok: true }),
    },
    needs: {
      businessInputSchema: {
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      execute: async () => ({ ok: true }),
    },
  };

  test("a route schema with no properties owns no parameters", () => {
    expect(
      foreignParameterWarnings("action", "bare", routes, { id: "x" }),
    ).toStrictEqual([
      {
        parameter: "id",
        message: "id is a action: needs argument; action: bare ignored it.",
        nextAction:
          "Drop id, or switch to action: needs if that is what you meant.",
      },
    ]);
  });

  test("an unknown selector or a missing required field is refused", async () => {
    await expect(
      dispatchComposite("action", routes, { action: "nope" }, context()),
    ).rejects.toThrow("action must be one of: bare, needs");
    await expect(
      dispatchComposite("action", routes, {}, context()),
    ).rejects.toThrow("action must be one of: bare, needs");
    await expect(
      dispatchComposite("action", routes, { action: "needs" }, context()),
    ).rejects.toThrow("id is required when action is needs");
  });

  test("kb_skills routes action list", async () => {
    const result = (await skillsSpec.execute(
      { action: "list" } as never,
      context(),
    )) as { structuredContent: Record<string, unknown> };
    expect(result.structuredContent.action).toBe("list");
  });
});
