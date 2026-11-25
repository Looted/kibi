/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// The schema 20 upgrade leaves the Kibi level as it is and says how a person
// chooses remember.
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { kibiLevelNote } from "../../src/commands/migrate.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import {
  atLevel,
  cleanupLevelWorkspaces,
  levelWorkspace,
} from "./workspace.js";

afterEach(cleanupLevelWorkspaces);

const LEVELS =
  "Schema 20: Kibi levels. At test, Kibi asks for the scenarios and linked tests that show each requirement holds, and blocks commits that leave them out; at remember, it records requirements, links them to code and catches contradictions, but asks for no scenarios, tests or proofs.";

describe("the schema 20 upgrade", () => {
  test("schema 20 is the latest", () => {
    expect(LATEST_KB_SCHEMA_VERSION).toBe(20);
  });

  test("a project that sets no level stays at test, and the note says how to choose remember", () => {
    const root = levelWorkspace({ "package.json": '{"name":"app"}' });
    expect(kibiLevelNote(root, false)).toBe(
      `${LEVELS} This project sets no level, so it stays at test, as before. To choose remember, a person sets kibi.level in package.json to "remember", or runs kibi init --level remember. Nothing is written.`,
    );
    expect(kibiLevelNote(levelWorkspace(), true)).toBe(
      `dry run: ${LEVELS} This project sets no level, so it stays at test, as before. To choose remember, a person sets level in .kb/setup.json to "remember", or runs kibi init --level remember. Nothing is written.`,
    );
    expect(readFileSync(path.join(root, "package.json"), "utf8")).toBe(
      '{"name":"app"}',
    );
  });

  test("a project that sets a level keeps it", () => {
    expect(kibiLevelNote(atLevel("remember"), false)).toContain(
      "This project is at remember (kibi.level in package.json).",
    );
  });
});
