import matter from "gray-matter";
import {
  FrontmatterError,
  detectEmbeddedEntities,
} from "../extractors/markdown.js";
import { entityLaneForPath } from "../utils/kb-paths.js";

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

    // Only requirements can embed other entities (detectEmbeddedEntities
    // returns nothing for any other type), so the path only has to tell a
    // requirement apart from everything else.
    const isRequirement = data.type
      ? data.type === "req"
      : entityLaneForPath(filePath) === "requirements";
    if (!isRequirement) {
      return { filePath, errors };
    }

    const embeddedEntities = detectEmbeddedEntities(data, "req");
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
