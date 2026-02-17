import { readFileSync } from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { extractFromManifest } from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdown,
} from "../extractors/markdown.js";
import { PrologProcess } from "../prolog.js";

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

export async function syncCommand(): Promise<void> {
  try {
    // Load config
    const configPath = path.join(process.cwd(), ".kb/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const paths = config.paths;

    // Discover files
    const markdownPatterns = [
      paths.requirements,
      paths.scenarios,
      paths.tests,
      paths.adr,
      paths.flags,
      paths.events,
    ].filter(Boolean);

    const markdownFiles = await fg(markdownPatterns, {
      cwd: process.cwd(),
      absolute: true,
    });

    const manifestFiles = await fg(paths.symbols, {
      cwd: process.cwd(),
      absolute: true,
    });

    // Extract entities and relationships
    const results: ExtractionResult[] = [];

    for (const file of markdownFiles) {
      try {
        results.push(extractFromMarkdown(file));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to extract from ${file}: ${message}`);
      }
    }

    for (const file of manifestFiles) {
      try {
        const manifestResults = extractFromManifest(file);
        results.push(...manifestResults);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to extract from ${file}: ${message}`);
      }
    }

    // Connect to KB
    const prolog = new PrologProcess();
    await prolog.start();

    const kbPath = path.join(process.cwd(), ".kb/branches/main");
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      throw new SyncError(
        `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
    }

    // Upsert entities
    let entityCount = 0;
    for (const { entity } of results) {
      try {
        const props = [
          `id='${entity.id}'`,
          `title="${entity.title.replace(/"/g, '\\"')}"`,
          `status=${entity.status}`,
          `created_at="${entity.created_at}"`,
          `updated_at="${entity.updated_at}"`,
          `source="${entity.source.replace(/"/g, '\\"')}"`,
        ];

        if (entity.tags && entity.tags.length > 0) {
          const tagsStr = JSON.stringify(entity.tags);
          props.push(`tags=${tagsStr}`);
        }
        if (entity.owner) props.push(`owner=${entity.owner}`);
        if (entity.priority) props.push(`priority=${entity.priority}`);
        if (entity.severity) props.push(`severity=${entity.severity}`);
        if (entity.text_ref) props.push(`text_ref="${entity.text_ref}"`);

        const propsList = `[${props.join(", ")}]`;
        const goal = `kb_assert_entity(${entity.type}, ${propsList})`;
        const result = await prolog.query(goal);
        if (result.success) {
          entityCount++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to upsert entity ${entity.id}: ${message}`,
        );
      }
    }

    // Build ID lookup map: filename -> entity ID
    const idLookup = new Map<string, string>();
    for (const { entity } of results) {
      const filename = path.basename(entity.source, ".md");
      idLookup.set(filename, entity.id);
      idLookup.set(entity.id, entity.id);
    }

    // Assert relationships
    let relCount = 0;
    for (const { relationships } of results) {
      for (const rel of relationships) {
        try {
          const fromId = idLookup.get(rel.from) || rel.from;
          const toId = idLookup.get(rel.to) || rel.to;

          const goal = `kb_assert_relationship(${rel.type}, '${fromId}', '${toId}', [])`;
          const result = await prolog.query(goal);
          if (result.success) relCount++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Failed to assert relationship ${rel.type}: ${rel.from} -> ${rel.to}: ${message}`,
          );
        }
      }
    }

    // Detach and cleanup
    await prolog.query("kb_detach");
    await prolog.terminate();

    console.log(
      `✓ Imported ${entityCount} entities, ${relCount} relationships`,
    );
    process.exit(0);
  } catch (error) {
    if (error instanceof SyncError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}
