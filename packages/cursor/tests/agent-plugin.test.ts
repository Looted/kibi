import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AGENT_MCP_SCHEMA,
  AGENT_PLUGIN_SCHEMA,
  EXPECTED_SKILL_IDS,
  agentPluginRoot,
  buildAgentPluginUnlocked,
} from "../scripts/build-agent-plugin";

const testRoot = import.meta.dir;
const packageRoot = path.resolve(testRoot, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

const PLUGIN_MANIFEST_KEYS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);

const MCP_MANIFEST_KEYS = new Set(["$schema", "mcpServers"]);

function walkFiles(rootDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function relativeTree(root: string): string[] {
  return walkFiles(root)
    .map((abs) => path.relative(root, abs))
    .sort();
}

describe("kibi-cursor portable Agent Plugin artifact", () => {
  const artifactRoot = agentPluginRoot(repoRoot);

  test("committed artifact exists with the expected layout", () => {
    expect(existsSync(path.join(artifactRoot, "plugin.json"))).toBe(true);
    expect(existsSync(path.join(artifactRoot, "mcp.json"))).toBe(true);
    expect(statSync(path.join(artifactRoot, "skills")).isDirectory()).toBe(
      true,
    );

    const present = new Set(
      readdirSync(path.join(artifactRoot, "skills"), {
        withFileTypes: true,
      })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
    for (const id of EXPECTED_SKILL_IDS) {
      expect(present.has(id)).toBe(true);
      expect(
        existsSync(path.join(artifactRoot, "skills", id, "SKILL.md")),
      ).toBe(true);
    }
  });

  test("plugin.json conforms to the Agent Plugins 1.0.0 plugin schema", () => {
    const raw = readFileSync(path.join(artifactRoot, "plugin.json"), "utf8");
    const manifest = JSON.parse(raw) as Record<string, unknown>;

    expect(manifest.$schema).toBe(AGENT_PLUGIN_SCHEMA);
    expect(manifest.name).toMatch(
      /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/,
    );
    expect(typeof manifest.version).toBe("string");
    expect(typeof manifest.description).toBe("string");

    for (const key of Object.keys(manifest)) {
      expect(PLUGIN_MANIFEST_KEYS.has(key)).toBe(true);
    }

    const author = manifest.author as { name?: unknown };
    expect(typeof author?.name).toBe("string");
  });

  test("mcp.json conforms to the Agent Plugins 1.0.0 MCP schema", () => {
    const raw = readFileSync(path.join(artifactRoot, "mcp.json"), "utf8");
    const mcp = JSON.parse(raw) as {
      $schema?: unknown;
      mcpServers?: Record<string, { type?: unknown; command?: unknown }>;
    };

    expect(mcp.$schema).toBe(AGENT_MCP_SCHEMA);
    expect(mcp.mcpServers).toBeTruthy();

    for (const key of Object.keys(mcp)) {
      expect(MCP_MANIFEST_KEYS.has(key)).toBe(true);
    }

    const server = mcp.mcpServers?.kibi;
    expect(server).toBeTruthy();
    expect(server?.type).toBe("stdio");
    expect(typeof server?.command).toBe("string");
  });

  test("generated artifact matches the committed artifact (no drift)", () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-agent-plugin-"),
    );
    try {
      const generated = buildAgentPluginUnlocked(repoRoot, tempRoot);
      expect(relativeTree(generated)).toEqual(relativeTree(artifactRoot));

      for (const rel of relativeTree(generated)) {
        const a = readFileSync(path.join(generated, rel));
        const b = readFileSync(path.join(artifactRoot, rel));
        expect(a.equals(b)).toBe(true);
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("version tracks the kibi-cursor package.json version", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { version?: string };
    const manifest = JSON.parse(
      readFileSync(path.join(artifactRoot, "plugin.json"), "utf8"),
    ) as { version?: string };

    expect(manifest.version).toBe(packageJson.version);
  });
});
