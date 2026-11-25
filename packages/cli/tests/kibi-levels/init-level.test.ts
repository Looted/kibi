/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// kibi init asks the person for the Kibi level (test recommended) and
// records the answer; without a terminal it takes --level, else test. The
// bootstrap skill has the agent ask the person before it runs kibi init.
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import {
  LEVEL_QUESTION,
  askAtTerminal,
  initCanAsk,
  parseLevelAnswer,
  settleKibiLevel,
  writeKibiLevel,
} from "../../src/commands/init-level.js";
import { loadBundledSkill } from "../../src/public/skills.js";
import { cleanupLevelWorkspaces, levelWorkspace } from "./workspace.js";

afterEach(cleanupLevelWorkspaces);

const read = (root: string, file: string) =>
  JSON.parse(readFileSync(path.join(root, file), "utf8"));

describe("kibi init and the Kibi level", () => {
  test("the question offers test as the recommended level and explains both", () => {
    expect(LEVEL_QUESTION).toContain("test      (recommended)");
    expect(LEVEL_QUESTION).toContain("remember  Kibi records requirements");
    expect(parseLevelAnswer("")).toBe("test");
    expect(parseLevelAnswer("  Remember ")).toBe("remember");
    expect(parseLevelAnswer("r")).toBe("remember");
    expect(parseLevelAnswer("t")).toBe("test");
    expect(parseLevelAnswer("prove")).toBeUndefined();
  });

  test("at a terminal the person's answer is recorded, asking again until it names a level", async () => {
    const root = levelWorkspace({ "package.json": '{\n  "name": "app"\n}\n' });
    const asked: string[] = [];
    const answers = ["maybe", "remember"];
    const settled = await settleKibiLevel(root, undefined, true, async (q) => {
      asked.push(q);
      return answers.shift() ?? "";
    });
    expect(settled).toEqual({ level: "remember", written: "package.json" });
    expect(asked).toEqual([LEVEL_QUESTION, "Please answer remember or test."]);
    expect(read(root, "package.json")).toEqual({
      name: "app",
      kibi: { level: "remember" },
    });
    // An empty answer takes the recommended level.
    const fresh = levelWorkspace();
    expect(
      await settleKibiLevel(fresh, undefined, true, async () => ""),
    ).toEqual({ level: "test", written: ".kb/setup.json" });
  });

  test("without a terminal --level is recorded, else test; nobody is asked", async () => {
    const never = async (): Promise<string> => {
      throw new Error("asked without a terminal");
    };
    const root = levelWorkspace();
    expect(await settleKibiLevel(root, undefined, false, never)).toEqual({
      level: "test",
      written: ".kb/setup.json",
    });
    expect(read(root, ".kb/setup.json")).toEqual({ level: "test" });
    expect(await settleKibiLevel(root, "REMEMBER", false, never)).toEqual({
      level: "remember",
      written: ".kb/setup.json",
    });
    expect(await settleKibiLevel(root, "prove", false, never)).toEqual({
      error: "unknown --level 'prove'. Expected one of: remember, test.",
    });
  });

  test("a recorded level is kept and not asked again; one that is not a level is asked again", async () => {
    const recorded = levelWorkspace({
      "package.json": JSON.stringify({ kibi: { level: "remember" } }),
    });
    const never = async (): Promise<string> => {
      throw new Error("asked again");
    };
    expect(await settleKibiLevel(recorded, undefined, true, never)).toEqual({
      level: "remember",
      written: null,
    });
    const invalid = levelWorkspace({
      ".kb/setup.json": JSON.stringify({ autoSync: true, level: "prove" }),
    });
    expect(
      await settleKibiLevel(invalid, undefined, true, async () => "test"),
    ).toEqual({ level: "test", written: ".kb/setup.json" });
    expect(read(invalid, ".kb/setup.json")).toEqual({
      autoSync: true,
      level: "test",
    });
  });

  test("the level is written to kibi.level in package.json, else to .kb/setup.json, and kept when unchanged", () => {
    const root = levelWorkspace({
      "package.json": '{\n\t"name": "app",\n\t"kibi": { "setup": {} }\n}',
    });
    expect(writeKibiLevel(root, "test")).toBe("package.json");
    expect(readFileSync(path.join(root, "package.json"), "utf8")).toBe(
      '{\n\t"name": "app",\n\t"kibi": {\n\t\t"setup": {},\n\t\t"level": "test"\n\t}\n}',
    );
    expect(writeKibiLevel(root, "test")).toBeNull();
    const bare = levelWorkspace({ ".kb/setup.json": "not json" });
    expect(writeKibiLevel(bare, "remember")).toBe(".kb/setup.json");
    expect(writeKibiLevel(bare, "remember")).toBeNull();
    expect(read(bare, ".kb/setup.json")).toEqual({ level: "remember" });
  });

  test("the terminal question reads one answer line", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let shown = "";
    output.on("data", (chunk) => {
      shown += String(chunk);
    });
    const answer = askAtTerminal("Which level?", input, output);
    input.write("remember\n");
    expect(await answer).toBe("remember");
    expect(shown).toContain("Which level?\nLevel [test]: ");
  });

  test("init asks only when both ends are a terminal outside CI", () => {
    const tty = { isTTY: true };
    expect(initCanAsk({}, tty, tty)).toBe(true);
    expect(initCanAsk({ CI: "true" }, tty, tty)).toBe(false);
    expect(initCanAsk({}, {}, tty)).toBe(false);
    expect(initCanAsk({}, tty, {})).toBe(false);
  });

  test("the bootstrap skill tells the agent to ask the person for the level and pass it to kibi init", () => {
    const body = loadBundledSkill("kibi-bootstrap").body;
    expect(body).toContain(
      "ask in that same message how hard Kibi should hold you to the requirements, before you run `kibi init`",
    );
    expect(body).toContain(
      "The choice is the person's: never pick it for them.",
    );
    expect(body).toContain("`--level test`/`--level remember`");
  });
});
