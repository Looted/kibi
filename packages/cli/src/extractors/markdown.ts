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
  constructor(
    message: string,
    public filePath: string,
  ) {
    super(message);
    this.name = "FrontmatterError";
  }
}

export function extractFromMarkdown(filePath: string): ExtractionResult {
  try {
    const content = readFileSync(filePath, "utf8");
    const { data, content: body } = matter(content);
    const type = data.type || inferTypeFromPath(filePath);

    if (!type) {
      throw new FrontmatterError(
        "Could not determine entity type from path or frontmatter",
        filePath,
      );
    }

    if (!data.title) {
      throw new FrontmatterError("Missing required field: title", filePath);
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
      throw new FrontmatterError(
        `Failed to parse frontmatter: ${error.message}`,
        filePath,
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
