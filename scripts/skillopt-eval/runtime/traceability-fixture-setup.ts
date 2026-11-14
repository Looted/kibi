/**
 * Setup for the kibi-traceability held-out fixtures in traceability-seeds.ts.
 * Each seeds the fresh KB, imports the extra authored state, then makes the
 * committed change the case's prompt describes without syncing it.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { commitAndSync, setupSeededFreshKb } from "./fixture-kb-setup";
import {
  MOVED_SYMBOL,
  MOVED_SYMBOL_DOCUMENTS,
  REPLACED_SYMBOL,
  REPLACED_SYMBOL_DOCUMENTS,
  SHARD_DOCUMENTS,
  annotateShard,
  moveLegacySymbolSource,
  removeObsoleteDeclaration,
  removeTargetFromShard,
  sourceWithBothVersions,
  symbolEntry,
} from "./traceability-seeds";

export const TRACEABILITY_SETUP_MODES = [
  "seeded_relationship_shard_kb",
  "seeded_stale_relationship_shard_kb",
  "seeded_removed_shard_edge_kb",
  "seeded_moved_symbol_kb",
  "seeded_replaced_symbol_kb",
] as const;

export type TraceabilitySetupMode = (typeof TRACEABILITY_SETUP_MODES)[number];

export function isTraceabilitySetupMode(
  mode: string,
): mode is TraceabilitySetupMode {
  return (TRACEABILITY_SETUP_MODES as readonly string[]).includes(mode);
}

async function appendSymbols(
  workspace: string,
  lines: readonly string[],
): Promise<void> {
  const path = join(workspace, ".kb", "symbols.yaml");
  const manifest = await readFile(path, "utf8");
  await writeFile(path, `${manifest.trimEnd()}\n${lines.join("\n")}\n`, "utf8");
}

export async function setupTraceabilityFixture(
  workspace: string,
  cliRoot: string,
  mode: TraceabilitySetupMode,
): Promise<void> {
  switch (mode) {
    case "seeded_relationship_shard_kb":
      await setupSeededFreshKb(workspace, cliRoot, {
        documents: SHARD_DOCUMENTS,
      });
      return;
    case "seeded_stale_relationship_shard_kb":
      await setupSeededFreshKb(workspace, cliRoot, {
        documents: SHARD_DOCUMENTS,
      });
      await annotateShard(workspace);
      return;
    case "seeded_removed_shard_edge_kb":
      await setupSeededFreshKb(workspace, cliRoot, {
        documents: SHARD_DOCUMENTS,
      });
      await removeTargetFromShard(workspace);
      return;
    case "seeded_moved_symbol_kb":
      await setupSeededFreshKb(workspace, cliRoot, {
        documents: MOVED_SYMBOL_DOCUMENTS,
      });
      await appendSymbols(
        workspace,
        symbolEntry(
          {
            id: MOVED_SYMBOL.id,
            title: MOVED_SYMBOL.title,
            sourceFile: MOVED_SYMBOL.deletedFile,
          },
          [
            { type: "implements", target: "REQ-SETUP-BASE" },
            { type: "covered_by", target: "TEST-SETUP-FIXTURE" },
          ],
        ),
      );
      await commitAndSync(workspace, cliRoot);
      await moveLegacySymbolSource(workspace);
      return;
    case "seeded_replaced_symbol_kb": {
      await setupSeededFreshKb(workspace, cliRoot, {
        documents: REPLACED_SYMBOL_DOCUMENTS,
      });
      const fixture = join(workspace, REPLACED_SYMBOL.sourceFile);
      await writeFile(
        fixture,
        sourceWithBothVersions(await readFile(fixture, "utf8")),
        "utf8",
      );
      await appendSymbols(workspace, [
        ...symbolEntry(
          {
            id: REPLACED_SYMBOL.obsolete,
            title: REPLACED_SYMBOL.obsoleteTitle,
            sourceFile: REPLACED_SYMBOL.sourceFile,
          },
          [
            { type: "implements", target: "REQ-SETUP-BASE" },
            { type: "covered_by", target: REPLACED_SYMBOL.test },
          ],
        ),
        ...symbolEntry(
          {
            id: REPLACED_SYMBOL.replacement,
            title: REPLACED_SYMBOL.replacementTitle,
            sourceFile: REPLACED_SYMBOL.sourceFile,
          },
          [{ type: "implements", target: "REQ-SETUP-BASE" }],
        ),
      ]);
      await commitAndSync(workspace, cliRoot);
      await removeObsoleteDeclaration(workspace);
      return;
    }
  }
}
