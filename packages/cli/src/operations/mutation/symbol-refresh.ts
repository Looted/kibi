import path from "node:path";
import { dump as dumpYaml, load as parseYaml } from "js-yaml";
import { enrichSymbolCoordinates } from "../../public/extractors/symbols-coordinator.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { CANONICAL_ENTITY_PATHS } from "../../utils/kb-paths.js";

type CoordinateRecord = {
  readonly sourceFile: string;
  readonly sourceLine: number;
  readonly sourceColumn: number;
  readonly sourceEndLine: number;
  readonly sourceEndColumn: number;
};

type RefreshResult = { readonly refreshed: boolean; readonly found: boolean };
type RefreshImplementation = (
  symbolId: string,
  context: OperationContext,
) => Promise<RefreshResult>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coordinate(value: unknown): CoordinateRecord | null {
  if (!record(value)) return null;
  const {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  } = value;
  return typeof sourceFile === "string" &&
    typeof sourceLine === "number" &&
    typeof sourceColumn === "number" &&
    typeof sourceEndLine === "number" &&
    typeof sourceEndColumn === "number"
    ? { sourceFile, sourceLine, sourceColumn, sourceEndLine, sourceEndColumn }
    : null;
}

async function manifestPath(context: OperationContext): Promise<string> {
  return path.join(context.workspaceRoot, CANONICAL_ENTITY_PATHS.symbols);
}

async function defaultRefresh(
  symbolId: string,
  context: OperationContext,
): Promise<RefreshResult> {
  const fs = context.fs;
  if (fs === undefined) return { refreshed: false, found: false };
  const manifest = await manifestPath(context);
  const parsed = parseYaml(await fs.readFile(manifest));
  if (!record(parsed) || !Array.isArray(parsed.symbols)) {
    return { refreshed: false, found: false };
  }
  const entry = parsed.symbols.find(
    (value) => record(value) && value.id === symbolId,
  );
  if (!record(entry)) return { refreshed: false, found: false };
  const sourceFile =
    typeof entry.sourceFile === "string" ? entry.sourceFile : "";
  const title = typeof entry.title === "string" ? entry.title : "";
  const [enriched] = await enrichSymbolCoordinates(
    [{ ...entry, id: symbolId, title, sourceFile }],
    context.workspaceRoot,
  );
  const next = coordinate(enriched);
  if (next === null) return { refreshed: false, found: true };
  const artifactPath = path.join(
    path.dirname(manifest),
    "symbol-coordinates.yaml",
  );
  let coordinates: Record<string, CoordinateRecord> = {};
  try {
    const artifact = parseYaml(await fs.readFile(artifactPath));
    if (record(artifact) && record(artifact.coordinates)) {
      coordinates = Object.fromEntries(
        Object.entries(artifact.coordinates).flatMap(([id, value]) => {
          const normalized = coordinate(value);
          return normalized === null ? [] : [[id, normalized]];
        }),
      );
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
  coordinates[symbolId] = next;
  const sorted = Object.fromEntries(
    Object.entries(coordinates).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const content = `# symbol-coordinates.yaml\n# GENERATED coordinate artifact — do not edit manually.\n# Run \`kibi sync --refresh-symbol-coordinates\` to refresh.\n${dumpYaml({ coordinates: sorted }, { lineWidth: -1, noRefs: true, sortKeys: true })}`;
  await fs.writeFile(artifactPath, content);
  return { refreshed: true, found: true };
}

let implementation: RefreshImplementation = defaultRefresh;

// implements REQ-kibi-operation-interface-parity
export async function refreshSymbolCoordinates(
  symbolId: string,
  context: OperationContext,
): Promise<RefreshResult> {
  return implementation(symbolId, context);
}

// implements REQ-kibi-operation-interface-parity
export function setSymbolRefreshForTests(
  refresh: RefreshImplementation | undefined,
): void {
  implementation = refresh ?? defaultRefresh;
}
