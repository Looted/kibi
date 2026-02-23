import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
  beforeEach,
} from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("KB Relationship Idempotency", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-idempotency");
    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
  });

  beforeEach(async () => {
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await prolog.query(`kb_attach('${testKbPath}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("should not create duplicate relationships when inserted twice", async () => {
    // 1. Create entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req1",
      properties: { title: "Req 1", status: "active", source: "test" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen1",
      properties: { title: "Scen 1", status: "active", source: "test" },
    });

    // 2. Assert relationship first time
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen1",
      properties: { title: "Scen 1", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "scen1", to: "req1" }],
    });

    // 3. Assert same relationship second time
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen1",
      properties: { title: "Scen 1", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "scen1", to: "req1" }],
    });

    // 4. Verify total count in KB using direct RDF query
    const countResult = await prolog.query(
      "findall(t(S,P,O), (kb_uri(Base), atom_concat(Base, specified_by, P), rdf(S, P, O)), Results)"
    );
    expect(countResult.success).toBe(true);
    const matches = countResult.bindings.Results.match(/t\(/g);
    expect(matches?.length).toBe(1);
  });

  test("should deduplicate relationships in a batch", async () => {
    // 1. Create entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req2",
      properties: { title: "Req 2", status: "active", source: "test" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen2",
      properties: { title: "Scen 2", status: "active", source: "test" },
    });

    // 2. Assert relationship twice in a batch
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen2",
      properties: { title: "Scen 2", status: "active", source: "test" },
      relationships: [
        { type: "specified_by", from: "scen2", to: "req2" },
        { type: "specified_by", from: "scen2", to: "req2" },
      ],
    });

    // 3. Verify total count in KB using direct RDF query
    const countResult = await prolog.query(
      "findall(t(S,P,O), (kb_uri(Base), atom_concat(Base, specified_by, P), rdf(S, P, O)), Results)"
    );
    expect(countResult.success).toBe(true);
    const matches = countResult.bindings.Results.match(/t\(/g);
    expect(matches?.length).toBe(1);
  });

  test("should be idempotent when retrying after success", async () => {
    // 1. Create entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req3",
      properties: { title: "Req 3", status: "active", source: "test" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen3",
      properties: { title: "Scen 3", status: "active", source: "test" },
    });

    // 2. Assert relationship
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen3",
      properties: { title: "Scen 3", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "scen3", to: "req3" }],
    });

    // 3. Retry same assertion
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen3",
      properties: { title: "Scen 3", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "scen3", to: "req3" }],
    });

    // 4. Verify total count in KB
    const countResult = await prolog.query(
      "findall(t(S,P,O), (kb_uri(Base), atom_concat(Base, specified_by, P), rdf(S, P, O)), Results)"
    );
    expect(countResult.success).toBe(true);
    const matches = countResult.bindings.Results.match(/t\(/g);
    expect(matches?.length).toBe(1);
  });
});
