/**
 * Persistent Prolog sessions for MCP integration tests that only use kb.pl
 * predicates (check, upsert, delete, query). Tests that call discovery.pl via
 * runJsonModuleQuery should keep Bun one-shot mode — interactive sessions can
 * hang on discovery goals.
 */
import "./ensure-test-branch.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";

type PrologOptions = ConstructorParameters<typeof PrologProcess>[0];
type QueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

export function createIntegrationProlog(
  options: PrologOptions = {},
): PrologProcess {
  const prolog = new PrologProcess(options);
  (prolog as unknown as { useOneShotMode: boolean }).useOneShotMode = false;
  return prolog;
}

/**
 * Bun 1.4.4 can leave the continuation of a query answered from the engine's
 * stdout waiting until the next timer fires (up to about a second), so a test
 * that runs a few hundred reads crawls past its timeout. A short timer kept
 * while an integration engine is open lets each answer resume at once; it is
 * unref'd so it never holds the test process open.
 */
let keepAwake: ReturnType<typeof setInterval> | null = null;
let openEngines = 0;

function holdEventLoopAwake(): void {
  openEngines += 1;
  keepAwake ??= setInterval(() => {}, 5).unref();
}

function releaseEventLoop(): void {
  openEngines = Math.max(0, openEngines - 1);
  if (openEngines === 0 && keepAwake !== null) {
    clearInterval(keepAwake);
    keepAwake = null;
  }
}

export async function startIntegrationProlog(
  options?: PrologOptions,
): Promise<PrologProcess> {
  const prolog = createIntegrationProlog(options);
  holdEventLoopAwake();
  try {
    await prolog.start();
  } catch (error) {
    releaseEventLoop();
    throw error;
  }
  const flagResult = await prolog.query(
    "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
  );
  if (!flagResult.success) {
    throw new Error(
      `Failed to configure Prolog answer options: ${flagResult.error ?? "unknown"}`,
    );
  }
  return prolog;
}

export async function createTestKbDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function attachTestKb(
  prolog: PrologProcess,
  testKbPath: string,
): Promise<QueryResult> {
  return prolog.query(`kb_attach('${testKbPath}')`);
}

export async function detachTestKb(prolog: PrologProcess): Promise<void> {
  if (prolog.isRunning()) {
    await prolog.query("kb_detach");
  }
}

export async function stopIntegrationProlog(
  prolog: PrologProcess,
): Promise<void> {
  try {
    await detachTestKb(prolog);
    if (prolog.isRunning()) {
      await prolog.terminate();
    }
  } finally {
    releaseEventLoop();
  }
}
