// implements REQ-upsert-unknown-field-guidance
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { contextFinding } from "../../src/entity-body-context.js";
import type { UpsertInput } from "../../src/operations/mutation/types.js";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";

const NOW = new Date("2026-10-07T00:00:00Z");

function rejection(input: UpsertInput): string {
  try {
    validateUpsertInput(input, NOW);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the upsert to be rejected");
}

/** The scenario example the kibi-bootstrap skill tells agents to copy. */
function bootstrapSkillScenarioExample(): UpsertInput {
  const skill = readFileSync(
    path.resolve(
      import.meta.dir,
      "../../src/public/skills/kibi-bootstrap/SKILL.md",
    ),
    "utf8",
  );
  const match = skill.match(/`(\{"type":"scenario".*?\})`/);
  if (!match?.[1]) throw new Error("kibi-bootstrap has no scenario example");
  return JSON.parse(match[1]) as UpsertInput;
}

describe("upsert unknown property guidance", () => {
  test("names a scenario body placed in properties and points at document.body", () => {
    const message = rejection({
      type: "scenario",
      id: "SCEN-guidance-body",
      properties: {
        title: "Deleting a draft clears it",
        status: "active",
        expects: "success",
        body: "Given a draft, when it is deleted, then it is gone.",
      },
    });
    expect(message).toContain("unknown property 'body'");
    expect(message).toContain("document.body");
    expect(message).not.toBe(
      "Entity validation failed: root: must NOT have additional properties",
    );
  });

  test("lists every unknown property, not only the first", () => {
    const message = rejection({
      type: "req",
      id: "REQ-guidance-many",
      properties: {
        title: "Many",
        status: "open",
        description: "prose",
        colour: "blue",
      },
    });
    expect(message).toContain("'description'");
    expect(message).toContain("'colour'");
    expect(message).toContain("document.body");
  });

  test("names an unknown non-prose property without a document.body hint", () => {
    const message = rejection({
      type: "scenario",
      id: "SCEN-guidance-other",
      properties: { title: "Other", status: "active", colour: "blue" },
    });
    expect(message).toContain("unknown property 'colour'");
    expect(message).not.toContain("document.body");
  });

  test("the kibi-bootstrap scenario example is a valid upsert with a context-bearing body", () => {
    const example = bootstrapSkillScenarioExample();
    expect(example.type).toBe("scenario");
    expect(example.properties.expects).toBe("success");
    const validated = validateUpsertInput(example, NOW);
    expect(validated.relationships).toEqual(example.relationships ?? []);
    const body = example.document?.body;
    expect(typeof body).toBe("string");
    expect(
      contextFinding("scenario", example.id, body as string, {
        title: example.properties.title,
      }),
    ).toBeNull();
  });
});
