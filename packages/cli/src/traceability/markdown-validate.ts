import matter from "gray-matter";
import {
  FrontmatterError,
  detectEmbeddedEntities,
} from "../extractors/markdown.js";

export interface MarkdownValidationResult {
  filePath: string;
  errors: FrontmatterError[];
}

export function validateStagedMarkdown(
  filePath: string,
  content: string,
): MarkdownValidationResult {
  const errors: FrontmatterError[] = [];

  try {
    const { data } = matter(content);

    const type = data.type || inferTypeFromPath(filePath);
    if (!type) {
      return { filePath, errors };
    }

    const embeddedEntities = detectEmbeddedEntities(data, type);
    if (embeddedEntities.length > 0) {
      const entityTypes = embeddedEntities.join(" and ");
      errors.push(
        new FrontmatterError(
          `Invalid embedded entity: requirement contains ${entityTypes} fields`,
          filePath,
          {
            classification: "Embedded Entity Violation",
            hint: `Move ${entityTypes} to separate entity files and link them using 'links' with relationship types like 'specified_by' or 'verified_by'.`,
          },
        ),
      );
    }
  } catch (error) {
    if (error instanceof FrontmatterError) {
      errors.push(error);
    }
  }

  return { filePath, errors };
}

function inferTypeFromPath(filePath: string): string | null {
  if (filePath.includes("/requirements/")) return "req";
  if (filePath.includes("/scenarios/")) return "scenario";
  if (filePath.includes("/tests/")) return "test";
  return null;
}
