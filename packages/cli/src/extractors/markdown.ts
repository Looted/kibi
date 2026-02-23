import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import matter from "gray-matter";

export interface ExtractedEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: unknown[];
  text_ref?: string;
}

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface ExtractionResult {
  entity: ExtractedEntity;
  relationships: ExtractedRelationship[];
}

export class FrontmatterError extends Error {
  public classification: string;
  public hint: string;
  public originalError?: string;

  constructor(
    message: string,
    public filePath: string,
    options?: {
      classification?: string;
      hint?: string;
      originalError?: string;
    },
  ) {
    super(message);
    this.name = "FrontmatterError";
    this.classification = options?.classification || "Generic Error";
    this.hint = options?.hint || "Check the file for syntax errors.";
    this.originalError = options?.originalError;
  }

  override toString() {
    let msg = `${this.filePath}: [${this.classification}] ${this.message}`;
    if (this.hint) {
      msg += `\nHow to fix:\n- ${this.hint}`;
    }
    if (this.originalError) {
      msg += `\n\nOriginal error: ${this.originalError}`;
    }
    return msg;
  }
}

export function extractFromMarkdown(filePath: string): ExtractionResult {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new FrontmatterError(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      { classification: "File Read Error" },
    );
  }

  try {
    const { data, content: body } = matter(content);

    if (content.trim().startsWith("---")) {
      const parts = content.split("---");
      if (parts.length < 3) {
        throw new FrontmatterError("Missing closing --- delimiter", filePath, {
          classification: "Missing closing ---",
          hint: "Ensure the frontmatter is enclosed between two '---' delimiters.",
        });
      }
    }

    const type = data.type || inferTypeFromPath(filePath);

    if (!type) {
      throw new FrontmatterError(
        "Could not determine entity type from path or frontmatter",
        filePath,
        {
          classification: "Missing Type",
          hint: "Add 'type: <type>' to frontmatter or place file in a typed directory (e.g., /requirements/).",
        },
      );
    }

    if (!data.title) {
      throw new FrontmatterError("Missing required field: title", filePath, {
        classification: "Missing Field",
        hint: "Add a 'title: ...' field to the YAML frontmatter.",
      });
    }

    const id = data.id || generateId(filePath, data.title);
    const relationships = extractRelationships(data.links || [], id);

    return {
      entity: {
        id,
        type,
        title: data.title,
        status: data.status || "draft",
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        source: filePath,
        tags: data.tags,
        owner: data.owner,
        priority: data.priority,
        severity: data.severity,
        links: data.links,
        text_ref: data.text_ref,
      },
      relationships,
    };
  } catch (error) {
    if (error instanceof FrontmatterError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message;
      let classification = "Frontmatter YAML syntax error";
      let hint = "Check the YAML syntax in your frontmatter.";

      if (
        message.includes("incomplete explicit mapping pair") &&
        message.includes(":")
      ) {
        classification = "Unquoted colon likely in title";
        hint =
          'Wrap values containing colons in quotes (e.g., title: "Foo: Bar").';
      } else if (
        !content.trim().startsWith("---") ||
        content.split("---").length < 3
      ) {
        if (
          content.trim().startsWith("---") &&
          content.split("---").length < 3
        ) {
          classification = "Missing closing ---";
          hint =
            "Ensure the frontmatter is enclosed between two '---' delimiters.";
        }
      } else if (
        message.includes("unexpected end of the stream") ||
        message.includes("flow collection") ||
        message.includes("end of the stream")
      ) {
        classification = "Generic YAML mapping error";
        hint = "Check for unclosed brackets, braces, or quotes in your YAML.";
      }

      throw new FrontmatterError(
        `Failed to parse frontmatter: ${message}`,
        filePath,
        {
          classification,
          hint,
          originalError: message,
        },
      );
    }

    throw error;
  }
}

function inferTypeFromPath(filePath: string): string | null {
  if (filePath.includes("/requirements/")) return "req";
  if (filePath.includes("/scenarios/")) return "scenario";
  if (filePath.includes("/tests/")) return "test";
  if (filePath.includes("/adr/")) return "adr";
  if (filePath.includes("/flags/")) return "flag";
  if (filePath.includes("/events/")) return "event";
  if (filePath.includes("/facts/")) return "fact";
  return null;
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}

interface LinkObject {
  type?: string;
  target?: string;
  id?: string;
  to?: string;
}

function extractRelationships(
  links: unknown[],
  fromId: string,
): ExtractedRelationship[] {
  if (!Array.isArray(links)) return [];

  return links.map((link) => {
    if (typeof link === "string") {
      return {
        type: "relates_to",
        from: fromId,
        to: link,
      };
    }

    const linkObj = link as LinkObject;
    return {
      type: linkObj.type || "relates_to",
      from: fromId,
      to: linkObj.target || linkObj.id || linkObj.to || "",
    };
  });
}
