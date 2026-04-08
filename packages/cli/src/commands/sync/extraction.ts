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

import { extractFromManifest } from "../../extractors/manifest.js";
import {
  type ExtractionResult,
  FrontmatterError,
  extractFromMarkdown,
} from "../../extractors/markdown.js";
import { toCacheKey } from "./cache.js";

export interface ExtractionOutput {
  results: ExtractionResult[];
  failedCacheKeys: Set<string>;
  errors: { file: string; message: string }[];
}

export async function processExtractions( // implements REQ-003
  changedMarkdownFiles: string[],
  changedManifestFiles: string[],
  validateOnly: boolean,
): Promise<ExtractionOutput> {
  const results: ExtractionResult[] = [];
  const failedCacheKeys = new Set<string>();
  const errors: { file: string; message: string }[] = [];

  for (const file of changedMarkdownFiles) {
    try {
      results.push(extractFromMarkdown(file));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Handle INVALID_AUTHORING diagnostics for embedded entities
      if (
        error instanceof FrontmatterError &&
        error.classification === "Embedded Entity Violation"
      ) {
        // v8 ignore next 10 lines: Embedded entity type detection - error analysis logic
        const embeddedTypes =
          message.includes("scenario") && message.includes("test")
            ? ["scenario", "test"]
            : message.includes("scenario")
              ? ["scenario"]
              : message.includes("test")
                ? ["test"]
                : ["entity"];
        // Note: diagnostics are created by the caller
      }

      if (validateOnly) {
        errors.push({ file, message });
      } else {
        console.warn(`Warning: Failed to extract from ${file}: ${message}`);
      }
      failedCacheKeys.add(toCacheKey(file));
    }
  }

  for (const file of changedManifestFiles) {
    try {
      const manifestResults = extractFromManifest(file);
      results.push(...manifestResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (validateOnly) {
        errors.push({ file, message });
      } else {
        console.warn(`Warning: Failed to extract from ${file}: ${message}`);
      }
      failedCacheKeys.add(toCacheKey(file));
    }
  }

  return { results, failedCacheKeys, errors };
}
