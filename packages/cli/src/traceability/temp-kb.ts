import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrologProcess } from "../prolog.js";
import type { ExtractedSymbol } from "./symbol-extract";

export interface TempKbContext {
  tempDir: string;
  kbPath: string;
  overlayPath: string;
  prolog: PrologProcess;
}

const prologByTempDir = new Map<string, PrologProcess>();
const cleanupByTempDir = new Map<string, () => void>();
const cleanedTempDirs = new Set<string>();

function isTraceEnabled(): boolean {
  return Boolean(process.env.KIBI_TRACE || process.env.KIBI_DEBUG);
}

function trace(message: string): void {
  if (isTraceEnabled()) {
    // eslint-disable-next-line no-console
    console.log(`[kibi-trace] ${message}`);
  }
}

function escapePrologAtom(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function createCleanupHandler(tempDir: string): () => void {
  let inProgress = false;

  return () => {
    if (inProgress || cleanedTempDirs.has(tempDir)) {
      return;
    }
    inProgress = true;

    void cleanupTempKb(tempDir).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      trace(`cleanup on signal/exit failed for ${tempDir}: ${message}`);
    });
  };
}

function registerCleanupHandlers(tempDir: string): void {
  const handler = createCleanupHandler(tempDir);

  process.once("exit", handler);
  process.once("SIGINT", handler);
  process.once("SIGTERM", handler);

  cleanupByTempDir.set(tempDir, () => {
    process.off("exit", handler);
    process.off("SIGINT", handler);
    process.off("SIGTERM", handler);
  });
}

async function consultOverlay(ctx: TempKbContext): Promise<void> {
  const prolog = prologByTempDir.get(ctx.tempDir);
  if (!prolog) {
    throw new Error(`No Prolog session found for temp dir: ${ctx.tempDir}`);
  }

  const consultResult = await prolog.query([
    `consult(${escapePrologAtom(ctx.overlayPath)})`,
  ]);

  if (!consultResult.success) {
    throw new Error(
      `Failed to consult overlay facts ${ctx.overlayPath}: ${consultResult.error || "unknown error"}`,
    );
  }
}

export { consultOverlay };

export async function createTempKb(baseKbPath: string): Promise<TempKbContext> {
  if (!existsSync(baseKbPath)) {
    throw new Error(`Base KB path does not exist: ${baseKbPath}`);
  }

  const tempDir = path.join(
    tmpdir(),
    `kibi-precommit-${process.pid}-${Date.now()}`,
  );
  const kbPath = path.join(tempDir, "kb");
  const overlayPath = path.join(tempDir, "changed_symbols.pl");

  trace(`creating temp KB directory ${tempDir}`);
  await mkdir(tempDir, { recursive: true });

  trace(`copying base KB ${baseKbPath} -> ${kbPath}`);
  await cp(baseKbPath, kbPath, { recursive: true });

  await writeFile(overlayPath, "", "utf8");

  const prolog = new PrologProcess();
  await prolog.start();
  prologByTempDir.set(tempDir, prolog);

  // ctx includes prolog so callers can use it directly
  const ctx: TempKbContext = { tempDir, kbPath, overlayPath, prolog };

  registerCleanupHandlers(tempDir);

  const attachResult = await prolog.query(
    `kb_attach(${escapePrologAtom(kbPath)})`,
  );
  if (!attachResult.success) {
    await cleanupTempKb(tempDir);
    throw new Error(
      `Failed to attach temporary KB at ${kbPath}: ${attachResult.error || "unknown error"}`,
    );
  }

  // Caller is expected to write overlay facts and then call consultOverlay(ctx).
  trace(`temporary KB ready at ${kbPath}`);

  return ctx;
}

export function createOverlayFacts(symbols: ExtractedSymbol[]): string {
  const lines: string[] = [];

  for (const symbol of symbols) {
    lines.push(`changed_symbol(${escapePrologAtom(symbol.id)}).`);
    lines.push(
      `changed_symbol_loc(${escapePrologAtom(symbol.id)}, ${escapePrologAtom(symbol.location.file)}, ${symbol.location.startLine}, 0, ${escapePrologAtom(symbol.name)}).`,
    );

    // Emit overlay facts for requirement links from code-comment directives.
    for (const reqId of symbol.reqLinks) {
      lines.push(
        `changed_symbol_req(${escapePrologAtom(symbol.id)}, ${escapePrologAtom(reqId)}).`,
      );
    }
  }

  return lines.join("\n");
}

export async function cleanupTempKb(tempDir: string): Promise<void> {
  if (cleanedTempDirs.has(tempDir)) {
    return;
  }
  cleanedTempDirs.add(tempDir);

  const unregister = cleanupByTempDir.get(tempDir);
  if (unregister) {
    unregister();
    cleanupByTempDir.delete(tempDir);
  }

  const prolog = prologByTempDir.get(tempDir);
  if (prolog) {
    try {
      await prolog.query("kb_detach");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      trace(`kb_detach failed during cleanup for ${tempDir}: ${message}`);
    }

    await prolog.terminate();
    prologByTempDir.delete(tempDir);
  }

  await rm(tempDir, { recursive: true, force: true });
  trace(`removed temporary KB directory ${tempDir}`);
}
