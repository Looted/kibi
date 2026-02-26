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

 Notes:
 - Apply the header to the source files (TS/JS/other) in `packages/*/src` before building.
 - For small CLI wrapper scripts (e.g. `packages/*/bin/*`) you can add the header as a block comment directly above the shebang line or below it; if you need the shebang to remain the very first line, place the header after the shebang.
 - Built `dist/` files are generated; prefer to modify source files and rebuild rather than editing `dist/` directly.

*/

import type { PrologProcess } from "kibi-cli/prolog";
import { parseAtomList } from "./prolog-list.js";

export interface SuggestSharedFactsArgs {
  min_frequency?: number;
}

export interface SharedFactSuggestion {
  concept: string;
  mentions: number;
  requirements: string[];
}

export interface SuggestSharedFactsResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    suggestions: SharedFactSuggestion[];
    count: number;
  };
}

/**
 * Handle analyze_shared_facts tool calls
 * Analyzes requirements to suggest shared domain facts for extraction
 */
export async function handleSuggestSharedFacts(
  prolog: PrologProcess,
  args: SuggestSharedFactsArgs,
): Promise<SuggestSharedFactsResult> {
  const minFreq = args.min_frequency ?? 2;

  try {
    // Query all requirements with their text properties
    const reqsResult = await prolog.query(
      "findall([Id,Title], (kb_entity(Id, req, Props), memberchk(title=Title, Props)), Reqs)",
    );

    if (!reqsResult.success || !reqsResult.bindings.Reqs) {
      return {
        content: [{ type: "text", text: "No requirements found in KB" }],
        structuredContent: { suggestions: [], count: 0 },
      };
    }

    const reqsList = parseAtomList(reqsResult.bindings.Reqs);
    const requirements: Array<{ id: string; title: string; description: string }> = [];

    // Parse the list-of-lists format from Prolog
    const reqMatch = reqsList.join("").matchAll(/\[([^,]+),([^\]]+)\]/g);
    if (reqMatch) {
      for (const match of reqMatch) {
        const id = match[1].trim().replace(/^'|'$/g, "");
        const title = match[2].trim().replace(/^'|'$/g, "");
        requirements.push({ id, title, description: title });
      }
    }

    // Query all existing facts for context
    const factsResult = await prolog.query(
      "findall([Id,Title], (kb_entity(Id, fact, Props), memberchk(title=Title, Props)), Facts)"
    );

    if (!factsResult.success || !factsResult.bindings.Facts) {
      return {
        content: [{ type: "text", text: "No facts found in KB" }],
        structuredContent: { suggestions: [], count: 0 },
      };
    }

    const factsList = parseAtomList(factsResult.bindings.Facts);
    const existingFacts = new Set<string>();
    const factMatch = factsList.join("").matchAll(/\[([^,]+),([^\]]+)\]/g);
    if (factMatch) {
      for (const match of factMatch) {
        const title = match[2].trim().replace(/^'|'$/g, "");
        existingFacts.add(title.toLowerCase());
      }
    }

    // Extract and analyze domain concepts from requirements
    const suggestions = analyzeSharedConcepts(requirements, existingFacts, minFreq);

    return {
      content: [
        {
          type: "text",
          text: `Found ${suggestions.length} potential shared fact(s) to consider creating.`,
        },
      ],
      structuredContent: {
        suggestions,
        count: suggestions.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Shared facts analysis failed: ${message}`);
  }
}

/**
 * Lightweight heuristic to identify shared domain concepts
 * Focuses on:
 * - Capitalized terms (possible domain concepts)
 * - Repeated phrases across multiple requirements
 * - Excludes existing facts
 */
function analyzeSharedConcepts(
  requirements: Array<{ id: string; title: string; description: string }>,
  existingFacts: Set<string>,
  minFreq: number,
): SharedFactSuggestion[] {
  const conceptCounts = new Map<string, Set<string>>();

  for (const req of requirements) {
    const originalText = `${req.title} ${req.description || ""}`;
    const text = originalText.toLowerCase();

    // Extract capitalized terms (potential domain concepts)
    // Pattern: words starting with capital letters that aren't at sentence start
    const capitalizedTerms = originalText.matchAll(/\b([A-Z][a-z]+)\b/g);

    // Extract repeated phrases (2+ words)
    // Extract repeated phrases (2+ words)
    const words = text.split(/\s+/).filter(w => w.length > 3);
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (!conceptCounts.has(phrase)) {
        conceptCounts.set(phrase, new Set());
      }
      conceptCounts.get(phrase)!.add(req.id);
    }

    // Also track individual capitalized terms
    for (const match of capitalizedTerms) {
      const lowerTerm = match[1].toLowerCase(); // Get the captured group
      if (!conceptCounts.has(lowerTerm)) {
        conceptCounts.set(lowerTerm, new Set());
      }
      conceptCounts.get(lowerTerm)!.add(req.id);
    }
  }

  // Generate suggestions
  const suggestions: SharedFactSuggestion[] = [];

  for (const [concept, reqIds] of conceptCounts) {
    if (reqIds.size >= minFreq) {
      // Skip if this concept already exists as a fact
      if (!existingFacts.has(concept)) {
        suggestions.push({
          concept: capitalizeConcept(concept),
          mentions: reqIds.size,
          requirements: Array.from(reqIds),
        });
      }
    }
  }

  // Sort by frequency (most mentioned first)
  return suggestions.sort((a, b) => b.mentions - a.mentions);
}

function capitalizeConcept(concept: string): string {
  return concept
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
