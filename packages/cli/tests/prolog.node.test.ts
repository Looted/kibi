import assert from "node:assert";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PrologProcess } from "../src/prolog";

// Node-interactive regression coverage tests

test("interactive mode smoke test (Node) - start/attach/assert/query/detach", async () => {
  const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-node-kb-"));
  const prolog = new PrologProcess();
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
  const prolog = new PrologProcess();
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
  const prolog = new PrologProcess({ timeout: 100 });
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
