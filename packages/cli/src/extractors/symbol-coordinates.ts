import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import type { ManifestSymbolRecord } from "./manifest.js";

export interface SymbolCoordinatesRecord {
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
}

export interface SymbolCoordinatesArtifact {
  coordinates: Record<string, SymbolCoordinatesRecord>;
}

const SYMBOL_COORDINATES_COMMENT_BLOCK = `# symbol-coordinates.yaml
# GENERATED coordinate artifact — do not edit manually.
# Run \`kibi sync --refresh-symbol-coordinates\` to refresh.
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCoordinateRecord(
  value: unknown,
): SymbolCoordinatesRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    sourceColumn,
    sourceEndColumn,
    sourceEndLine,
    sourceFile,
    sourceLine,
  } = value;

  if (
    typeof sourceFile !== "string" ||
    typeof sourceLine !== "number" ||
    typeof sourceColumn !== "number" ||
    typeof sourceEndLine !== "number" ||
    typeof sourceEndColumn !== "number"
  ) {
    return null;
  }

  return {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  };
}

function sortCoordinates(
  coordinates: Record<string, SymbolCoordinatesRecord>,
): Record<string, SymbolCoordinatesRecord> {
  const sortedCoordinates: Record<string, SymbolCoordinatesRecord> = {};

  for (const symbolId of Object.keys(coordinates).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const record = normalizeCoordinateRecord(coordinates[symbolId]);
    if (!record) {
      continue;
    }

    sortedCoordinates[symbolId] = record;
  }

  return sortedCoordinates;
}

// implements REQ-core-extractors
export function readCoordinateArtifact(
  content: string,
): SymbolCoordinatesArtifact {
  const parsed = parseYAML(content) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.coordinates)) {
    return { coordinates: {} };
  }

  const coordinates: Record<string, SymbolCoordinatesRecord> = {};

  for (const [symbolId, record] of Object.entries(parsed.coordinates)) {
    const normalizedRecord = normalizeCoordinateRecord(record);
    if (!normalizedRecord) {
      continue;
    }

    coordinates[symbolId] = normalizedRecord;
  }

  return { coordinates };
}

// implements REQ-core-extractors
export function writeCoordinateArtifact(
  coordinates: Record<string, SymbolCoordinatesRecord>,
): string {
  const artifact: SymbolCoordinatesArtifact = {
    coordinates: sortCoordinates(coordinates),
  };

  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(artifact, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: true,
  })}`;
}

// implements REQ-core-extractors
export function mergeCoordinatesWithManifest(
  symbolRecords: ManifestSymbolRecord[],
  coordinateArtifact: SymbolCoordinatesArtifact | null,
): ManifestSymbolRecord[] {
  const coordinates = coordinateArtifact?.coordinates ?? {};

  return symbolRecords.map((symbolRecord) => {
    const legacyRecord: ManifestSymbolRecord = { ...symbolRecord };
    const symbolId =
      typeof symbolRecord.id === "string" ? symbolRecord.id : undefined;
    const coordinateRecord = symbolId ? coordinates[symbolId] : undefined;

    if (!coordinateRecord) {
      return legacyRecord;
    }

    const { coordinatesGeneratedAt: _coordinatesGeneratedAt, ...mergedRecord } =
      legacyRecord;

    return {
      ...mergedRecord,
      ...coordinateRecord,
    };
  });
}
