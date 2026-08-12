import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface BranchKbStamp {
  branchPath: string;
  rdfDev: number | null;
  rdfIno: number | null;
  rdfSize: number | null;
  rdfMtimeMs: number | null;
  rdfCtimeMs: number | null;
  dirDev: number | null;
  dirIno: number | null;
  dirMtimeMs: number | null;
  dirCtimeMs: number | null;
  rdfMissing: boolean;
  dirMissing: boolean;
  errorMessage: string | null;
}

export class KbRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KbRefreshError";
  }
}

export async function readBranchKbStamp(
  branchPath: string,
): Promise<BranchKbStamp> {
  const stamp = emptyStamp(branchPath);
  const errors: string[] = [];

  try {
    const dirStat = await stat(branchPath);
    stamp.dirDev = dirStat.dev;
    stamp.dirIno = dirStat.ino;
    stamp.dirMtimeMs = dirStat.mtimeMs;
    stamp.dirCtimeMs = dirStat.ctimeMs;
    stamp.dirMissing = false;
  } catch (error) {
    stamp.dirMissing = true;
    errors.push(formatStatError(branchPath, error));
  }

  const markerPath = path.join(branchPath, "storage.json");
  let journaled = false;
  try {
    journaled = (await readFile(markerPath, "utf8")).includes(
      "kibi.rdf-journal.v1",
    );
  } catch {
    journaled = false;
  }
  // Journaled stores expose CURRENT as their cheap, atomic freshness marker;
  // legacy stores retain kb.rdf for compatibility.
  const rdfPath = path.join(branchPath, journaled ? "CURRENT" : "kb.rdf");
  try {
    const rdfStat = await stat(rdfPath);
    stamp.rdfDev = rdfStat.dev;
    stamp.rdfIno = rdfStat.ino;
    stamp.rdfSize = rdfStat.size;
    stamp.rdfMtimeMs = rdfStat.mtimeMs;
    stamp.rdfCtimeMs = rdfStat.ctimeMs;
    stamp.rdfMissing = false;
  } catch (error) {
    stamp.rdfMissing = true;
    errors.push(formatStatError(rdfPath, error));
  }

  stamp.errorMessage = errors.length > 0 ? errors.join("; ") : null;
  return stamp;
}

export function sameBranchKbStamp(a: BranchKbStamp, b: BranchKbStamp): boolean {
  return (
    a.branchPath === b.branchPath &&
    a.rdfDev === b.rdfDev &&
    a.rdfIno === b.rdfIno &&
    a.rdfSize === b.rdfSize &&
    a.rdfMtimeMs === b.rdfMtimeMs &&
    a.rdfCtimeMs === b.rdfCtimeMs &&
    a.dirDev === b.dirDev &&
    a.dirIno === b.dirIno &&
    a.dirMtimeMs === b.dirMtimeMs &&
    a.dirCtimeMs === b.dirCtimeMs &&
    a.rdfMissing === b.rdfMissing &&
    a.dirMissing === b.dirMissing &&
    a.errorMessage === b.errorMessage
  );
}

export function describeBranchKbStamp(stamp: BranchKbStamp): string {
  return [
    `branchPath=${stamp.branchPath}`,
    `rdf(dev=${stamp.rdfDev}, ino=${stamp.rdfIno}, size=${stamp.rdfSize}, mtimeMs=${stamp.rdfMtimeMs}, ctimeMs=${stamp.rdfCtimeMs})`,
    `dir(dev=${stamp.dirDev}, ino=${stamp.dirIno}, mtimeMs=${stamp.dirMtimeMs}, ctimeMs=${stamp.dirCtimeMs})`,
    `rdfMissing=${stamp.rdfMissing}`,
    `dirMissing=${stamp.dirMissing}`,
    `errorMessage=${stamp.errorMessage ?? "null"}`,
  ].join(" ");
}

function emptyStamp(branchPath: string): BranchKbStamp {
  return {
    branchPath,
    rdfDev: null,
    rdfIno: null,
    rdfSize: null,
    rdfMtimeMs: null,
    rdfCtimeMs: null,
    dirDev: null,
    dirIno: null,
    dirMtimeMs: null,
    dirCtimeMs: null,
    rdfMissing: true,
    dirMissing: true,
    errorMessage: null,
  };
}

function formatStatError(statPath: string, error: unknown): string {
  if (error instanceof Error) {
    return `${statPath}: ${error.message}`;
  }
  return `${statPath}: ${String(error)}`;
}
