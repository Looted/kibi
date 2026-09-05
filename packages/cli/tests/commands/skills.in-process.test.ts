import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  skillsListCommand,
  skillsLoadCommand,
  skillsReadCommand,
  skillsValidateCommand,
} from "../../src/commands/skills.js";
import { captureIo } from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const skillRoot = path.resolve(
  __dirname,
  "../../src/public/skills/kibi-usage",
);

describe("skills commands", () => {
  test("lists bundled skills as json and table", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    await skillsListCommand({ format: "json" });
    const listed = JSON.parse(io.logText());
    expect(listed.some((skill: { id: string }) => skill.id === "kibi-usage")).toBe(
      true,
    );
    await skillsListCommand({});
    expect(io.logText()).toContain("kibi-usage");
  });

  test("loads a bundled skill as json and markdown", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    await skillsLoadCommand("kibi-usage", { format: "json" });
    const bundle = JSON.parse(io.logText());
    expect(bundle.metadata.id).toBe("kibi-usage");
    expect(bundle.sourceType).toBe("bundled");
    expect(bundle.contentHash).toMatch(/^[a-f0-9]{64}$/);

    await skillsLoadCommand("kibi-usage", { format: "markdown" });
    expect(io.stdout.join("")).toContain("# Kibi Usage");
  });

  test("reads a declared resource as json and text", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    await skillsReadCommand("kibi-usage", "resources/fact-lanes.md", {
      format: "json",
    });
    const payload = JSON.parse(io.logText());
    expect(payload.resource).toBe("resources/fact-lanes.md");
    expect(payload.contents).toContain("observation");

    await skillsReadCommand("kibi-usage", "resources/fact-lanes.md", {
      format: "text",
    });
    expect(io.stdout.join("")).toContain("Fact");
  });

  test("validates a skill bundle and reports invalid ids without throwing", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const valid = await skillsValidateCommand(skillRoot, { format: "json" });
    expect(valid).toBeUndefined();
    expect(JSON.parse(io.logText())).toEqual({ valid: true, errors: [] });

    await skillsValidateCommand(skillRoot, { format: "table" });
    expect(io.logText()).toContain("Valid");

    const missing = await skillsLoadCommand("missing-skill", {});
    expect(missing).toEqual({ exitCode: 1 });
    expect(io.errorText().length).toBeGreaterThan(0);

    const invalidRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-skill-invalid-"));
    roots.push(invalidRoot);
    writeFileSync(path.join(invalidRoot, "SKILL.md"), "not a skill\n");
    await skillsValidateCommand(invalidRoot, { format: "table" });
    expect(io.logText()).toContain("false");
  });
});
