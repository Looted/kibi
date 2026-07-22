import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020";
import { z } from "zod";
import {
  ApprovalSchema,
  EpisodeRequestSchema,
  EpisodeResultSchema,
  EvidenceIndexSchema,
  LedgerEntrySchema,
  ProposalSchema,
  ReportSchema,
  RunLockSchema,
  RunStateSchema,
  canonicalJson,
} from "../contracts";

type JsonValue = z.infer<ReturnType<typeof z.json>>;
type JsonObject = Readonly<Record<string, JsonValue>>;

const schemaRoot = resolve(
  import.meta.dir,
  "../../../documentation/evaluations/skillopt",
);
const fixturePath = join(import.meta.dir, "fixtures/valid-run-lock.json");
const corpusPath = join(import.meta.dir, "fixtures/contract-corpus.json");
const PatchSchema = z.object({
  path: z.array(z.string()).min(1),
  value: z.json(),
});
const CorpusSchema = z.object({
  fixtures: z.record(z.string(), z.record(z.string(), z.json())),
  cases: z.array(
    z
      .object({
        name: z.string().min(1),
        schema: z.string().endsWith(".schema.json"),
        fixture: z.string().min(1),
        accepted: z.boolean(),
        patch: PatchSchema.optional(),
        patches: z.array(PatchSchema).optional(),
      })
      .strict(),
  ),
});
const zodSchemas: Readonly<Record<string, z.ZodType>> = {
  "approval.schema.json": ApprovalSchema,
  "episode-request.schema.json": EpisodeRequestSchema,
  "episode-result.schema.json": EpisodeResultSchema,
  "evidence-index.schema.json": EvidenceIndexSchema,
  "ledger-entry.schema.json": LedgerEntrySchema,
  "proposal.schema.json": ProposalSchema,
  "report.schema.json": ReportSchema,
  "run-lock.schema.json": RunLockSchema,
  "run-state.schema.json": RunStateSchema,
};

function readJson(path: string): JsonObject {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return z.record(z.string(), z.json()).parse(parsed);
}

function applyPatch(
  target: Record<string, JsonValue>,
  path: string[],
  value: JsonValue,
): void {
  const [key, ...rest] = path;
  if (key === undefined) return;
  if (rest.length === 0) {
    target[key] = value;
    return;
  }
  const child = target[key];
  if (child === null || Array.isArray(child) || typeof child !== "object") {
    throw new TypeError(`patch path ${path.join(".")} is not an object`);
  }
  applyPatch(child, rest, value);
}

function materialize(
  fixtures: Readonly<Record<string, JsonObject>>,
  fixture: string,
  patches: readonly z.infer<typeof PatchSchema>[],
): JsonObject {
  const base =
    fixture === "run-lock" ? readJson(fixturePath) : fixtures[fixture];
  if (base === undefined) throw new TypeError(`unknown fixture ${fixture}`);
  const artifact = structuredClone(base);
  for (const patch of patches) applyPatch(artifact, patch.path, patch.value);
  return artifact;
}

function configuredAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const name of readdirSync(schemaRoot).filter((entry) =>
    entry.endsWith(".schema.json"),
  )) {
    ajv.addSchema(readJson(join(schemaRoot, name)));
  }
  return ajv;
}

describe("SkillOpt JSON schemas", () => {
  test("loads every schema and validates the complete run-lock fixture", () => {
    const ajv = configuredAjv();
    const fixture = readJson(fixturePath);

    expect(ajv.validate("run-lock.schema.json", fixture)).toBe(true);
    expect(RunLockSchema.parse(fixture).schemaVersion).toBe("1.0.0");
  });

  test("keeps JSON Schema and Zod acceptance and serialization aligned", () => {
    const ajv = configuredAjv();
    const corpus = CorpusSchema.parse(
      JSON.parse(readFileSync(corpusPath, "utf8")),
    );

    for (const item of corpus.cases) {
      const schema = zodSchemas[item.schema];
      if (schema === undefined)
        throw new TypeError(`missing Zod schema ${item.schema}`);
      const patches =
        item.patches ?? (item.patch === undefined ? [] : [item.patch]);
      const artifact = materialize(corpus.fixtures, item.fixture, patches);
      const zodResult = schema.safeParse(artifact);

      expect(ajv.validate(item.schema, artifact), item.name).toBe(
        item.accepted,
      );
      expect(zodResult.success, item.name).toBe(item.accepted);
      if (zodResult.success) {
        expect(canonicalJson(z.json().parse(zodResult.data)), item.name).toBe(
          canonicalJson(artifact),
        );
      }
    }
  });

  test("rejects oversized fields across every JSON Schema artifact family", () => {
    const ajv = configuredAjv();
    const corpus = CorpusSchema.parse(
      JSON.parse(readFileSync(corpusPath, "utf8")),
    );
    const huge = "x".repeat(1_048_577);
    const cases: readonly [
      string,
      string,
      string,
      readonly z.infer<typeof PatchSchema>[],
    ][] = [
      [
        "approval",
        "approval.schema.json",
        "approval",
        [{ path: ["reviewer"], value: huge }],
      ],
      [
        "episode request",
        "episode-request.schema.json",
        "episode-request",
        [{ path: ["prompt"], value: huge }],
      ],
      [
        "episode result",
        "episode-result.schema.json",
        "episode-result",
        [{ path: ["criticalFailures"], value: [huge] }],
      ],
      [
        "evidence",
        "evidence-index.schema.json",
        "evidence-index",
        [
          {
            path: ["events"],
            value: [
              {
                sequence: 0,
                receivedAt: "2026-07-21T12:00:00Z",
                event: { payload: huge },
              },
            ],
          },
        ],
      ],
      [
        "ledger",
        "ledger-entry.schema.json",
        "ledger-entry",
        [{ path: ["category"], value: huge }],
      ],
      [
        "report",
        "report.schema.json",
        "report",
        [{ path: ["cells"], value: [huge] }],
      ],
      [
        "run lock",
        "run-lock.schema.json",
        "run-lock",
        [{ path: ["artifactRoot"], value: huge }],
      ],
    ];

    for (const [name, schema, fixture, patches] of cases) {
      const artifact = materialize(corpus.fixtures, fixture, patches);
      expect(ajv.validate(schema, artifact), name).toBe(false);
    }
  });
});
