/**
 * MCP Protocol Regression Tests
 * 
 * Tests MCP protocol compliance and validates the supported API surface.
 * 
 * SUPPORTED PROTOCOL (spec-valid MCP):
 * - initialize: Must be called first to establish session
 * - tools/list: Returns available tools
 * - tools/call: Invokes a tool by name (e.g., kb_query)
 * 
 * UNSUPPORTED (intentionally rejected with -32601 Method not found):
 * - Direct tool method names (e.g., {"method":"kb_query"}) - NOT supported
 * - Any method other than initialize/tools/list/tools/call
 * 
 * ERROR CODES:
 * - -32700: Parse error (malformed JSON)
 * - -32600: Invalid Request (invalid JSON-RPC shape)
 * - -32601: Method not found (unsupported method)
 * 
 * These tests ensure consumer-reported protocol issues stay fixed.
 */

import assert from "node:assert";
import { spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { packAll, createSandbox, type TestSandbox } from "./helpers.js";

import { spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { packAll, createSandbox, type TestSandbox } from "./helpers.js";

interface JsonRpcReq { jsonrpc?: string; id?: number; method?: string; params?: any }
interface JsonRpcRes { jsonrpc?: string; id?: number; result?: any; error?: { code: number; message: string } }

function sendRaw(proc: any, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (d: Buffer) => {
      buf += d.toString();
      // resolve on first newline-delimited JSON line
      const idx = buf.indexOf('\n');
      if (idx !== -1) {
        const line = buf.slice(0, idx).trim();
        proc.stdout.off('data', onData);
        resolve(line);
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(payload + "\n", (err) => { if (err) reject(err); });
    // safety timeout
    setTimeout(() => {
      proc.stdout.off('data', onData);
      reject(new Error('timeout waiting for response'));
    }, 10000);
  });
}

describe('MCP protocol regression (packed)', () => {
  let sandbox: TestSandbox;
  let tarballs: Awaited<ReturnType<typeof packAll>>;
  let hasProlog = true;

  before({ timeout: 120000 }, async () => {
    tarballs = await packAll();
    sandbox = createSandbox();
    await sandbox.install(tarballs);
    await sandbox.initGitRepo();
    // create minimal data
    // use helpers from existing mcp.test.ts pattern if needed
  });

  after(async () => {
    if (sandbox) await sandbox.cleanup();
  });

  it('should return -32700 for malformed JSON and stay alive', async () => {
    const proc = spawn('node', [sandbox.kibiMcpBin], { cwd: sandbox.repoDir, env: sandbox.env, stdio: ['pipe','pipe','pipe'] });
    // give server time to start
    await new Promise(r => setTimeout(r, 500));

    const respLine = await sendRaw(proc, 'not json');
    const parsed = JSON.parse(respLine) as JsonRpcRes;
    assert.strictEqual(parsed.error?.code, -32700, 'expected parse error code');

    // server should still accept valid initialize after parse error
    const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', clientInfo: { name: 'e2e' } } };
    const initRespLineP = sendRaw(proc, JSON.stringify(init));
    const initLine = await initRespLineP;
    const initMsg = JSON.parse(initLine) as JsonRpcRes;
    assert.strictEqual(initMsg.id, 1);
    proc.kill();
  });

  it('should return -32600 for invalid JSON-RPC shape and stay alive', async () => {
    const proc = spawn('node', [sandbox.kibiMcpBin], { cwd: sandbox.repoDir, env: sandbox.env, stdio: ['pipe','pipe','pipe'] });
    await new Promise(r => setTimeout(r, 500));

    const invalid = JSON.stringify({ foo: 'bar' });
    const respLine = await sendRaw(proc, invalid);
    const parsed = JSON.parse(respLine) as JsonRpcRes;
    assert.strictEqual(parsed.error?.code, -32600, 'expected invalid request');

    // server still alive
    const init = { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2024-11-05', clientInfo: { name: 'e2e' } } };
    const initLine = JSON.parse(await sendRaw(proc, JSON.stringify(init))) as JsonRpcRes;
    assert.strictEqual(initLine.id, 2);
    proc.kill();
  });

  it('should return -32601 for direct legacy method call kb_query', async () => {
    const proc = spawn('node', [sandbox.kibiMcpBin], { cwd: sandbox.repoDir, env: sandbox.env, stdio: ['pipe','pipe','pipe'] });
    await new Promise(r => setTimeout(r, 500));

    const direct = JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'kb_query', params: { type: 'req' } });
    const respLine = await sendRaw(proc, direct);
    const parsed = JSON.parse(respLine) as JsonRpcRes;
    assert.strictEqual(parsed.error?.code, -32601);
    proc.kill();
  });

  it('should support initialize -> tools/list -> tools/call kb_query flow', async () => {
    const proc = spawn('node', [sandbox.kibiMcpBin], { cwd: sandbox.repoDir, env: sandbox.env, stdio: ['pipe','pipe','pipe'] });
    await new Promise(r => setTimeout(r, 500));

    const init = { jsonrpc: '2.0', id: 100, method: 'initialize', params: { protocolVersion: '2024-11-05', clientInfo: { name: 'e2e' } } };
    const list = { jsonrpc: '2.0', id: 101, method: 'tools/list' };
    const call = { jsonrpc: '2.0', id: 102, method: 'tools/call', params: { name: 'kb_query', arguments: { type: 'req' } } };

    const initLine = JSON.parse(await sendRaw(proc, JSON.stringify(init))) as JsonRpcRes;
    assert.strictEqual(initLine.id, 100);

    const listLine = JSON.parse(await sendRaw(proc, JSON.stringify(list))) as JsonRpcRes;
    assert.strictEqual(listLine.id, 101);
    assert.ok(Array.isArray(listLine.result?.tools));

    const callLine = JSON.parse(await sendRaw(proc, JSON.stringify(call))) as JsonRpcRes;
    assert.strictEqual(callLine.id, 102);
    // result may be empty but should not be an error
    assert.ok(!callLine.error, 'tools/call should succeed or return structured result');

    proc.kill();
  });

}, { timeout: 60000 });
