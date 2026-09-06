// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import {
  OPERATION_DATA_SCHEMAS,
  declaredEffects,
} from "../../src/public/operations/contracts.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("operation contracts remaining catalog and effect declarations", () => {
  test("exposes nullable advisor fields and unique effect declarations", () => {
    restores.push(isolateKibiEnv());
    const validate = OPERATION_DATA_SCHEMAS.kb_validate_upsert
      .properties as Record<string, { type?: unknown; anyOf?: unknown }>;
    expect(validate.semanticAdvisor).toMatchObject({
      type: ["object", "null"],
    });
    const effects = declaredEffects("kb_status", ["local-read", "kb-read"]);
    expect(effects.map((effect) => effect.kind)).toEqual([
      "local-read",
      "kb-read",
    ]);
  });
});
