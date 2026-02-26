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
