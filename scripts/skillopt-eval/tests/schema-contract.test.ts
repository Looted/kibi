import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020";
import { z } from "zod";
import { EpisodeResultSchema, RunLockSchema } from "../contracts";

type JsonValue = z.infer<ReturnType<typeof z.json>>;

const schemaRoot = resolve(
  import.meta.dir,
  "../../../documentation/evaluations/skillopt",
);
const fixturePath = join(import.meta.dir, "fixtures/valid-run-lock.json");
const corpusPath = join(import.meta.dir, "fixtures/contract-corpus.json");
const CorpusSchema = z.array(
  z.object({
    name: z.string().min(1),
    schema: z.literal("episode-result.schema.json"),
    accepted: z.boolean(),
    artifact: z.json(),
  }),
);

function readJson(path: string): Record<string, JsonValue> {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return z.record(z.string(), z.json()).parse(parsed);
}

describe("SkillOpt JSON schemas", () => {
  test("loads every schema and validates the shared run-lock fixture", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const schemaFiles = readdirSync(schemaRoot).filter((name) =>
      name.endsWith(".schema.json"),
    );
    for (const name of schemaFiles) {
      ajv.addSchema(readJson(join(schemaRoot, name)));
    }

    const fixture = readJson(fixturePath);
    expect(ajv.validate("run-lock.schema.json", fixture)).toBe(true);
    expect(RunLockSchema.parse(fixture).schemaVersion).toBe("1.0.0");
    expect(schemaFiles).toContain("approval.schema.json");
    expect(schemaFiles).toContain("episode-request.schema.json");
    expect(schemaFiles).toContain("episode-result.schema.json");
    expect(schemaFiles).toContain("evidence-index.schema.json");
    expect(schemaFiles).toContain("ledger-entry.schema.json");
    expect(schemaFiles).toContain("proposal.schema.json");
    expect(schemaFiles).toContain("run-state.schema.json");
  });

  test("keeps JSON Schema and Zod acceptance aligned on the shared corpus", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    for (const name of readdirSync(schemaRoot).filter((entry) =>
      entry.endsWith(".schema.json"),
    )) {
      ajv.addSchema(readJson(join(schemaRoot, name)));
    }
    const corpus = CorpusSchema.parse(
      JSON.parse(readFileSync(corpusPath, "utf8")),
    );
    for (const item of corpus) {
      expect(ajv.validate(item.schema, item.artifact), item.name).toBe(
        item.accepted,
      );
      expect(
        EpisodeResultSchema.safeParse(item.artifact).success,
        item.name,
      ).toBe(item.accepted);
    }
  });
});
