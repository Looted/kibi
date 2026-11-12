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

export async function startIntegrationProlog(
  options?: PrologOptions,
): Promise<PrologProcess> {
  const prolog = createIntegrationProlog(options);
  await prolog.start();
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
  await detachTestKb(prolog);
  if (prolog.isRunning()) {
    await prolog.terminate();
  }
}
