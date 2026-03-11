import assert from "node:assert";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PrologProcess } from "../src/prolog";

// Node-interactive regression coverage tests

function createInteractiveProlog(
  options?: ConstructorParameters<typeof PrologProcess>[0],
): PrologProcess {
  const prolog = new PrologProcess(options);
  (prolog as unknown as { useOneShotMode: boolean }).useOneShotMode = false;
  return prolog;
}

test("interactive mode smoke test (Node) - start/attach/assert/query/detach", async () => {
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-node-kb-"));
  const prolog = createInteractiveProlog();
  try {
    await prolog.start();

    // attach KB
    const attach = await prolog.query(`kb_attach('${tempKbDir}')`);
    assert.strictEqual(attach.success, true, "kb_attach should succeed");

    // assert an entity and save
    const assertRes = await prolog.query(
      `kb_assert_entity(req, [id='REQ-NODE-001', title="Node Entity", status=active, created_at="2026-02-20T00:00:00Z", updated_at="2026-02-20T00:00:00Z", source="node-test"])`,
    );
    assert.strictEqual(
      assertRes.success,
      true,
      "kb_assert_entity should succeed",
    );

    const saveRes = await prolog.query("kb_save");
    assert.strictEqual(saveRes.success, true, "kb_save should succeed");

    // query existence
    const exists = await prolog.query("kb_entity('REQ-NODE-001', _, _)");
    assert.strictEqual(
      exists.success,
      true,
      "kb_entity should report existence",
    );

    // detach
    await prolog.query("kb_detach");
  } finally {
    try {
      await prolog.terminate();
    } catch {}
    if (existsSync(tempKbDir))
      rmSync(tempKbDir, { recursive: true, force: true });
  }
});

test("deterministic once(kb_entity(...)) returns promptly (<5s)", async () => {
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-node-kb-"));
  const prolog = createInteractiveProlog();
  try {
    await prolog.start();
    await prolog.query(`kb_attach('${tempKbDir}')`);

    // assert entity
    const a = await prolog.query(
      `kb_assert_entity(req, [id='REQ-ONCE-001', title="Once Entity", status=active, created_at="2026-02-20T00:00:00Z", updated_at="2026-02-20T00:00:00Z", source="node-once"])`,
    );
    assert.strictEqual(a.success, true);
    await prolog.query("kb_save");

    // once(kb_entity(...)) should return quickly; measure time
    const start = Date.now();
    const res = await prolog.query("once(kb_entity('REQ-ONCE-001', _, _))");
    const elapsed = Date.now() - start;
    assert.strictEqual(res.success, true, "once(...) should succeed");
    assert(elapsed < 5000, `once(...) took too long: ${elapsed}ms`);

    await prolog.query("kb_detach");
  } finally {
    try {
      await prolog.terminate();
    } catch {}
    if (existsSync(tempKbDir))
      rmSync(tempKbDir, { recursive: true, force: true });
  }
});

test("timeout message reports configured timeout (100ms) not hardcoded 30s", async () => {
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-node-kb-"));
  // set timeout short to trigger
  const prolog = createInteractiveProlog({ timeout: 100 });
  try {
    await prolog.start();

    // Run a goal that will block: repeat, fail to loop
    let threw = false;
    let errorMessage = "";
    try {
      await prolog.query("repeat, fail");
    } catch (err: unknown) {
      threw = true;
      const e = err as Error | string | undefined;
      errorMessage = typeof e === "string" ? e : (e?.message ?? String(e));
    }
    assert(threw, "Expected query to throw due to timeout");

    // Accept either 100ms expressed as "100ms" or "0.1s" or as seconds number like "0.1"
    const ok =
      errorMessage.includes("100ms") ||
      errorMessage.includes("0.1s") ||
      errorMessage.includes("0.1");
    assert(
      ok,
      `timeout message did not contain configured timeout: ${errorMessage}`,
    );

    // Skip detach - process may be in bad state after timeout
  } finally {
    try {
      await prolog.terminate();
    } catch {}
    if (existsSync(tempKbDir))
      rmSync(tempKbDir, { recursive: true, force: true });
  }
});

// Issue #53 regression tests: same-process attach/detach lifecycle failures
// These tests reproduce the "No permission to modify static procedure 'kb:entity/4'" error
// that occurs when reattaching to a KB in the same live Prolog process.

test("fails on repeated kb_attach in same process (Node regression #53)", async () => {
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-node-kb-"));
  const prolog = createInteractiveProlog();
  try {
    await prolog.start();

    // First attach should succeed
    const attach1 = await prolog.query(`kb_attach('${tempKbDir}')`);
    assert.strictEqual(attach1.success, true, "First kb_attach should succeed");

    // Assert an entity to populate the KB
    const assertRes = await prolog.query(
      `kb_assert_entity(req, [id='REQ-REPEAT-001', title="Repeat Entity", status=active, created_at="2026-02-20T00:00:00Z", updated_at="2026-02-20T00:00:00Z", source="repeat-test"])`,
    );
    assert.strictEqual(
      assertRes.success,
      true,
      "kb_assert_entity should succeed",
    );

    await prolog.query("kb_save");

    // Second attach to same KB should fail with static procedure error (regression #53)
    const attach2 = await prolog.query(`kb_attach('${tempKbDir}')`);
    assert.strictEqual(
      attach2.success,
      true,
      "Second kb_attach should succeed",
    );

    await prolog.query("kb_detach");
  } finally {
    try {
      await prolog.terminate();
    } catch {}
    if (existsSync(tempKbDir))
      rmSync(tempKbDir, { recursive: true, force: true });
  }
});

test("kb_detach then kb_attach allows querying in same process (Node regression #53)", async () => {
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-node-kb-"));
  const prolog = createInteractiveProlog();
  try {
    await prolog.start();

    // First attach cycle
    const attach1 = await prolog.query(`kb_attach('${tempKbDir}')`);
    assert.strictEqual(attach1.success, true, "First kb_attach should succeed");

    const assertRes = await prolog.query(
      `kb_assert_entity(req, [id='REQ-REATTACH-001', title="Reattach Entity", status=active, created_at="2026-02-20T00:00:00Z", updated_at="2026-02-20T00:00:00Z", source="reattach-test"])`,
    );
    assert.strictEqual(
      assertRes.success,
      true,
      "kb_assert_entity should succeed",
    );

    await prolog.query("kb_save");

    // Query before detach
    const query1 = await prolog.query("kb_entity('REQ-REATTACH-001', _, _)");
    assert.strictEqual(
      query1.success,
      true,
      "Query before detach should succeed",
    );

    // Detach
    const detach = await prolog.query("kb_detach");
    assert.strictEqual(detach.success, true, "kb_detach should succeed");

    // Reattach - this demonstrates the detach/reattach instability from issue #53
    const attach2 = await prolog.query(`kb_attach('${tempKbDir}')`);
    assert.strictEqual(attach2.success, true, "Reattach should succeed");

    const query2 = await prolog.query("kb_entity('REQ-REATTACH-001', _, _)");
    assert.strictEqual(
      query2.success,
      true,
      "Query after reattach should succeed",
    );

    await prolog.query("kb_detach");
  } finally {
    try {
      await prolog.terminate();
    } catch {}
    if (existsSync(tempKbDir))
      rmSync(tempKbDir, { recursive: true, force: true });
  }
});

test("interactive mode serializes concurrent queries without timing out", async () => {
  const prolog = createInteractiveProlog({ timeout: 5000 });
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-stress-"));
  try {
    await prolog.start();

    const attach = await prolog.query(`kb_attach('${tempKbDir}')`);
    assert.strictEqual(attach.success, true, "attach should succeed");

    const upsert = await prolog.query(
      `kb_assert_entity(req, [id='REQ-STRESS-000', title="Stress 0", status=active, created_at="2026-02-20T00:00:00Z", updated_at="2026-02-20T00:00:00Z", source="stress-test"])`,
    );
    assert.strictEqual(upsert.success, true, "assert should succeed");

    const save = await prolog.query("kb_save");
    assert.strictEqual(save.success, true, "save should succeed");

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        prolog.query(`(kb_entity('REQ-STRESS-000', _, _), X = ${i})`),
      ),
    );

    for (let i = 0; i < results.length; i++) {
      assert.strictEqual(
        results[i]?.success,
        true,
        `query should succeed for ${i}`,
      );
      assert.strictEqual(
        results[i]?.bindings.X,
        String(i),
        `binding should match ${i}`,
      );
    }

    const detach = await prolog.query("kb_detach");
    assert.strictEqual(detach.success, true, "detach should succeed");
  } finally {
    try {
      await prolog.terminate();
    } catch {}
    if (existsSync(tempKbDir)) {
      rmSync(tempKbDir, { recursive: true, force: true });
    }
  }
});
