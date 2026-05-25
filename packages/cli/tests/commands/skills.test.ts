import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import * as path from "node:path";

describe("kibi skills", () => {
  const kibiCli = path.resolve(__dirname, "../../src/cli.ts");
  const skillRoot = path.resolve(
    __dirname,
    "../../src/public/skills/kibi-usage",
  );

  function runSkills(args: string[]): string {
    return execFileSync("bun", [kibiCli, "skills", ...args], {
      encoding: "utf8",
    });
  }

  test("lists bundled skills as json", () => {
    const output = runSkills(["list", "--format", "json"]);
    const skills = JSON.parse(output) as Array<{ id: string; name: string }>;

    expect(skills.some((skill) => skill.id === "kibi-usage")).toBe(true);
    expect(skills.find((skill) => skill.id === "kibi-usage")?.name).toBe(
      "Kibi Usage",
    );
  });

  test("loads a bundled skill as markdown", () => {
    const output = runSkills(["load", "kibi-usage", "--format", "markdown"]);

    expect(output).toContain("# Kibi Usage");
    expect(output).toContain("MCP-Only Rules");
  });

  test("loads a bundled skill as json", () => {
    const output = runSkills(["load", "kibi-usage", "--format", "json"]);
    const bundle = JSON.parse(output) as {
      manifest: { id: string; resources?: string[] };
      body: string;
    };

    expect(bundle.manifest.id).toBe("kibi-usage");
    expect(bundle.manifest.resources).toContain("resources/fact-lanes.md");
    expect(bundle.body).toContain("# Kibi Usage");
  });

  test("reads a declared bundled skill resource", () => {
    const output = runSkills([
      "read",
      "kibi-usage",
      "resources/fact-lanes.md",
      "--format",
      "text",
    ]);

    expect(output).toContain("Fact");
    expect(output).toContain("observation");
  });

  test("validates a skill bundle path", () => {
    const output = runSkills(["validate", skillRoot, "--format", "json"]);
    const result = JSON.parse(output) as { valid: boolean; errors: unknown[] };

    expect(result).toEqual({ valid: true, errors: [] });
  });

  test("returns a non-zero result for an invalid skill id without a stack trace", () => {
    const result = spawnSync(
      "bun",
      [kibiCli, "skills", "load", "missing-skill"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Skill not found: missing-skill");
    expect(result.stderr).not.toContain("at ");
  });

  test("returns a non-zero result for an undeclared resource", () => {
    const result = spawnSync(
      "bun",
      [kibiCli, "skills", "read", "kibi-usage", "SKILL.md"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Skill resource not found: kibi-usage/SKILL.md",
    );
    expect(result.stderr).not.toContain("at ");
  });
});
