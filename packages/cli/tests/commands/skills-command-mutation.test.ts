import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { stripVTControlCharacters as stripAnsi } from "node:util";
import * as skills from "kibi-cli/skills";
import {
  skillsListCommand,
  skillsLoadCommand,
  skillsReadCommand,
  skillsValidateCommand,
} from "../../src/commands/skills.js";

const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: string[] = [];
let out: string[] = [];

beforeEach(() => {
  logs = [];
  errors = [];
  out = [];
  const spies = [
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
    spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    }),
    spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
      out.push(chunk);
      return true;
    }) as never),
  ];
  for (const spy of spies) restores.push(() => spy.mockRestore());
});

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function stub(
  name: keyof typeof skills,
  answer: (...args: unknown[]) => unknown,
) {
  const calls: unknown[][] = [];
  const spy = spyOn(skills, name as never).mockImplementation(((
    ...args: unknown[]
  ) => {
    calls.push(args);
    return answer(...args);
  }) as never);
  restores.push(() => (spy as { mockRestore(): void }).mockRestore());
  return calls;
}

const manifest = {
  id: "kibi-usage",
  name: "Kibi usage",
  version: "1.0.0",
  description: "How to use Kibi",
};

describe("skillsListCommand", () => {
  test("prints skills as JSON or a table", async () => {
    stub("listBundledSkills", () => [manifest]);
    expect(await skillsListCommand({ format: "json" })).toBeUndefined();
    expect(await skillsListCommand({})).toBeUndefined();
    expect(logs[0]).toBe(JSON.stringify([manifest], null, 2));
    expect(stripAnsi(logs[1] ?? "")).toBe(
      [
        "┌────────────┬────────────┬─────────┬─────────────────┐",
        "│ ID         │ Name       │ Version │ Description     │",
        "├────────────┼────────────┼─────────┼─────────────────┤",
        "│ kibi-usage │ Kibi usage │ 1.0.0   │ How to use Kibi │",
        "└────────────┴────────────┴─────────┴─────────────────┘",
      ].join("\n"),
    );
  });

  test("reports a failure as exit code 1", async () => {
    stub("listBundledSkills", () => {
      throw new Error("no skills");
    });
    expect(await skillsListCommand({})).toStrictEqual({ exitCode: 1 });
    stub("listBundledSkills", () => {
      throw "plain";
    });
    expect(await skillsListCommand({})).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(["no skills", "plain"]);
  });
});

describe("skillsLoadCommand", () => {
  test("prints the body with one trailing newline", async () => {
    const calls = stub("loadBundledSkill", (id) => ({
      manifest,
      body: id === "a" ? "body\n" : "body",
    }));
    await skillsLoadCommand("a", {});
    await skillsLoadCommand("b", { format: "markdown" });
    expect(calls).toStrictEqual([["a"], ["b"]]);
    expect(out).toStrictEqual(["body\n", "body\n"]);
  });

  test("prints metadata, resources and a content hash as JSON", async () => {
    stub("loadBundledSkill", () => ({
      manifest: { ...manifest, resources: ["r.md"] },
      body: "text",
    }));
    await skillsLoadCommand("a", { format: "json" });
    stub("loadBundledSkill", () => ({ manifest, body: "text" }));
    await skillsLoadCommand("a", { format: "json" });
    const hash = createHash("sha256").update("text").digest("hex");
    expect(logs).toStrictEqual([
      JSON.stringify(
        {
          metadata: { ...manifest, resources: ["r.md"] },
          body: "text",
          resources: ["r.md"],
          contentHash: hash,
          sourceType: "bundled",
        },
        null,
        2,
      ),
      JSON.stringify(
        {
          metadata: manifest,
          body: "text",
          resources: [],
          contentHash: hash,
          sourceType: "bundled",
        },
        null,
        2,
      ),
    ]);
  });
});

describe("skillsReadCommand", () => {
  test("prints a resource as text or JSON", async () => {
    const calls = stub("readBundledSkillResource", (_id, resource) =>
      resource === "a" ? "line\n" : "line",
    );
    await skillsReadCommand("s", "a", {});
    await skillsReadCommand("s", "b", { format: "text" });
    await skillsReadCommand("s", "b", { format: "json" });
    expect(calls).toStrictEqual([
      ["s", "a"],
      ["s", "b"],
      ["s", "b"],
    ]);
    expect(out).toStrictEqual(["line\n", "line\n"]);
    expect(logs).toStrictEqual([
      JSON.stringify({ id: "s", resource: "b", contents: "line" }, null, 2),
    ]);
  });
});

describe("skillsValidateCommand", () => {
  test("prints the field and message of each error", async () => {
    const calls = stub("validateSkillBundle", () => ({
      valid: false,
      errors: [
        { field: "name", message: "missing", extra: 1 },
        { field: "id", message: "bad" },
      ],
    }));
    await skillsValidateCommand("dir", { format: "json" });
    await skillsValidateCommand("dir", {});
    expect(calls[0]).toStrictEqual(["dir"]);
    expect(logs[0]).toBe(
      JSON.stringify(
        {
          valid: false,
          errors: [
            { field: "name", message: "missing" },
            { field: "id", message: "bad" },
          ],
        },
        null,
        2,
      ),
    );
    expect(stripAnsi(logs[1] ?? "")).toBe(
      [
        "┌───────┬───────┬─────────┐",
        "│ Valid │ Field │ Message │",
        "├───────┼───────┼─────────┤",
        "│ false │ name  │ missing │",
        "├───────┼───────┼─────────┤",
        "│ false │ id    │ bad     │",
        "└───────┴───────┴─────────┘",
      ].join("\n"),
    );
  });

  test("prints a single valid row without errors", async () => {
    stub("validateSkillBundle", () => ({ valid: true, errors: [] }));
    await skillsValidateCommand("dir", { format: "table" });
    expect(stripAnsi(logs[0] ?? "")).toBe(
      [
        "┌───────┬───────┬─────────┐",
        "│ Valid │ Field │ Message │",
        "├───────┼───────┼─────────┤",
        "│ true  │       │         │",
        "└───────┴───────┴─────────┘",
      ].join("\n"),
    );
  });
});
