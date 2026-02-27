/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface SymbolEntry {
  id: string;
  title: string;
  /** Absolute path of the source file where this symbol lives, if available. */
  sourceFile?: string;
  /** 1-based line number of the symbol declaration within sourceFile. */
  sourceLine?: number;
  /** Raw links from symbols.yaml (related entity IDs). */
  links: string[];
}

export interface SymbolIndex {
  /** title (lowercased) → SymbolEntry[] */
  byTitle: Map<string, SymbolEntry[]>;
  /** absolute source file path → SymbolEntry[] */
  byFile: Map<string, SymbolEntry[]>;
  /** symbol id → SymbolEntry */
  byId: Map<string, SymbolEntry>;
}

export function buildIndex(
  manifestPath: string,
  workspaceRoot: string,
): SymbolIndex {
  const byTitle = new Map<string, SymbolEntry[]>();
  const byFile = new Map<string, SymbolEntry[]>();
  const byId = new Map<string, SymbolEntry>();

  if (!fs.existsSync(manifestPath)) return { byTitle, byFile, byId };

  let rawSymbols: Array<Record<string, unknown>>;
  try {
    rawSymbols = parseSymbolsManifest(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return { byTitle, byFile, byId };
  }

  for (const sym of rawSymbols) {
    const id = String(sym.id ?? "");
    const title = String(sym.title ?? "");
    if (!id || !title) continue;

    const rawSource = String(sym.sourceFile ?? sym.source ?? "");
    let sourceFile: string | undefined;
    if (rawSource && !rawSource.startsWith("http")) {
      sourceFile = path.isAbsolute(rawSource)
        ? rawSource
        : path.resolve(workspaceRoot, rawSource);
    }

    const sourceLine =
      typeof sym.sourceLine === "number" ? sym.sourceLine : undefined;

    const rawLinks = sym.links;
    const links: string[] = Array.isArray(rawLinks)
      ? rawLinks.map((l) => String(l))
      : [];

    const entry: SymbolEntry = { id, title, sourceFile, sourceLine, links };
    byId.set(id, entry);

    const titleKey = title.toLowerCase();
    if (!byTitle.has(titleKey)) byTitle.set(titleKey, []);
    const arr = byTitle.get(titleKey);
    if (arr) arr.push(entry);

    if (sourceFile) {
      if (!byFile.has(sourceFile)) byFile.set(sourceFile, []);
      const farr = byFile.get(sourceFile);
      if (farr) farr.push(entry);
    }
  }

  return { byTitle, byFile, byId };
}

function parseSymbolsManifest(content: string): Array<Record<string, unknown>> {
  const lines = content.split(/\r?\n/);
  const symbols: Array<Record<string, unknown>> = [];

  let inSymbols = false;
  let current: Record<string, unknown> | null = null;
  let inLinks = false;

  const pushCurrent = () => {
    if (!current) return;
    if (!Array.isArray(current.links)) current.links = [];
    symbols.push(current);
  };

  const unquote = (value: string): string => {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!inSymbols) {
      if (trimmed === "symbols:") inSymbols = true;
      continue;
    }

    const itemMatch = trimmed.match(/^-+\s*id:\s*(.+)$/);
    if (itemMatch) {
      pushCurrent();
      current = {
        id: unquote(itemMatch[1]),
        links: [],
      };
      inLinks = false;
      continue;
    }

    if (!current) continue;

    if (trimmed === "links:") {
      inLinks = true;
      continue;
    }

    if (inLinks) {
      const linkMatch = trimmed.match(/^-+\s*(.+)$/);
      if (linkMatch) {
        (current.links as string[]).push(unquote(linkMatch[1]));
        continue;
      }
      inLinks = false;
    }

    const titleMatch = trimmed.match(/^title:\s*(.+)$/);
    if (titleMatch) {
      current.title = unquote(titleMatch[1]);
      continue;
    }

    const sourceMatch = trimmed.match(/^(sourceFile|source):\s*(.+)$/);
    if (sourceMatch) {
      current[sourceMatch[1]] = unquote(sourceMatch[2]);
      continue;
    }

    const sourceLineMatch = trimmed.match(/^sourceLine:\s*(\d+)$/);
    if (sourceLineMatch) {
      current.sourceLine = Number(sourceLineMatch[1]);
      continue;
    }
  }

  pushCurrent();
  return symbols;
}

/** Run `kibi query --relationships <id> --format json` and return the parsed result. */
export function queryRelationshipsViaCli(
  symbolId: string,
  workspaceRoot: string,
): Array<{ type: string; from: string; to: string }> {
  try {
    const output = execSync(
      `bun run packages/cli/bin/kibi query --relationships ${symbolId} --format json`,
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 10000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return JSON.parse(output) as Array<{
      type: string;
      from: string;
      to: string;
    }>;
  } catch {
    return [];
  }
}

// Named exports are already performed inline above. No additional export list needed.
