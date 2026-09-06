import { describe, expect, spyOn, test } from "bun:test";
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
  assertCanonicalSourceComplete,
  buildAgentPluginUnlocked,
  buildPluginManifest,
  formatAgentJson,
  formatAgentJsonDocument,
  main,
  repoRootFromScript,
  repositoryUrl,
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
    expect(existsSync(path.join(artifactRoot, "bin"))).toBe(false);
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
      mcpServers?: Record<
        string,
        { type?: unknown; command?: unknown; args?: unknown }
      >;
    };

    expect(mcp.$schema).toBe(AGENT_MCP_SCHEMA);
    expect(mcp.mcpServers).toBeTruthy();

    for (const key of Object.keys(mcp)) {
      expect(MCP_MANIFEST_KEYS.has(key)).toBe(true);
    }

    const server = mcp.mcpServers?.kibi;
    expect(server).toBeTruthy();
    expect(server?.type).toBe("stdio");
    expect(server?.command).toBe("npx");
    expect(server?.args).toEqual(["--no-install", "kibi-mcp"]);
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

  test("formats wide JSON, repository URLs, and missing skill sources", () => {
    expect(formatAgentJson(null, 0, 0)).toBe("null");
    expect(formatAgentJson(["alpha", "beta"], 0, 0)).toBe('["alpha", "beta"]');
    const wide = Array.from({ length: 12 }, (_, index) => `item-${index}-value`);
    expect(formatAgentJson(wide, 0, 0)).toContain("\n");
    expect(
      formatAgentJson(
        {
          longKey: "a".repeat(40),
          otherKey: "b".repeat(40),
        },
        0,
        0,
      ),
    ).toContain("\n");
    expect(formatAgentJsonDocument({ a: 1 })).toBe('{ "a": 1 }\n');
    expect(repositoryUrl({ repository: "https://example.com/repo.git" })).toBe(
      "https://example.com/repo.git",
    );
    expect(
      repositoryUrl({ repository: { url: "https://example.com/object.git" } }),
    ).toBe("https://example.com/object.git");
    expect(repositoryUrl({})).toBe("https://github.com/Looted/kibi");
    expect((buildPluginManifest({}) as { repository: string }).repository).toBe(
      "https://github.com/Looted/kibi",
    );
    expect(repoRootFromScript()).toBe(repoRoot);

    const missingRoot = path.join(os.tmpdir(), `kibi-missing-skills-${Date.now()}`);
    expect(() => assertCanonicalSourceComplete(missingRoot)).toThrow(
      "Canonical skills source missing",
    );
    const incomplete = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-partial-skills-"));
    try {
      fs.mkdirSync(path.join(incomplete, "kibi-bootstrap"), { recursive: true });
      expect(() => assertCanonicalSourceComplete(incomplete)).toThrow(
        "missing its SKILL.md",
      );
    } finally {
      fs.rmSync(incomplete, { recursive: true, force: true });
    }
  });

  test("CLI writes the artifact and rejects unknown flags", async () => {
    const writes: string[] = [];
    const stderrWrite = process.stderr.write.bind(process.stderr);
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    process.stderr.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stderr.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as typeof process.exit);
    try {
      await expect(main(["--nope"])).rejects.toThrow("exit:2");
      expect(writes.some((chunk) => chunk.includes("unknown flag"))).toBe(true);
      const fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-agent-cli-"));
      try {
        for (const id of EXPECTED_SKILL_IDS) {
          fs.mkdirSync(
            path.join(fakeRoot, "packages/cli/src/public/skills", id),
            { recursive: true },
          );
          fs.writeFileSync(
            path.join(fakeRoot, "packages/cli/src/public/skills", id, "SKILL.md"),
            `# ${id}\n`,
          );
        }
        fs.mkdirSync(path.join(fakeRoot, "packages/cursor"), { recursive: true });
        fs.writeFileSync(
          path.join(fakeRoot, "packages/cursor", "package.json"),
          JSON.stringify({
            name: "kibi-cursor",
            version: "0.0.0-test",
            homepage: "https://example.com",
            license: "MIT",
          }),
        );
        await main(["--write"], fakeRoot);
        expect(
          writes.some((chunk) => chunk.includes("wrote Agent Plugin")),
        ).toBe(true);
        await expect(main([], path.join(fakeRoot, "missing"))).rejects.toThrow(
          "exit:1",
        );
      } finally {
        fs.rmSync(fakeRoot, { recursive: true, force: true });
      }

      const scriptPath = fileURLToPath(
        new URL("../scripts/build-agent-plugin.ts", import.meta.url),
      );
      const previousArgv = process.argv.slice();
      process.argv = [previousArgv[0] ?? "bun", scriptPath, "--nope"];
      try {
        await import(
          `${new URL("../scripts/build-agent-plugin.ts", import.meta.url).href}?cli=${Date.now()}`
        );
      } catch (error) {
        expect(String(error)).toContain("exit:2");
      } finally {
        process.argv = previousArgv;
      }
    } finally {
      exit.mockRestore();
      process.stderr.write = stderrWrite;
      process.stdout.write = stdoutWrite;
    }
  });
});
