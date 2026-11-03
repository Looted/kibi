import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getRequirementPriority,
  isMustPriorityRequirement,
} from "../src/requirement-doc";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-reqdoc-"));
let counter = 0;

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function doc(content: string): string {
  counter += 1;
  const file = path.join(dir, `req-${counter}.md`);
  fs.writeFileSync(file, content);
  return file;
}

function priorityOf(frontmatter: string): string | null {
  return getRequirementPriority(doc(`---\n${frontmatter}\n---\nbody\n`));
}

describe("requirement frontmatter priority", () => {
  test.each([
    ["priority: must", "must"],
    ['priority: "must"', "must"],
    ["priority: 'must'", "must"],
    ['priority: "must', '"must'],
    ['priority: must"', 'must"'],
    ["priority: 'must", "'must"],
    ["priority: must'", "must'"],
    ["priority : must", "must"],
    ["priority: must # inline", "must"],
    ["priority: must  # two spaces", "must"],
    ['priority: "a # b"', "a # b"],
    ["priority: 'a # b'", "a # b"],
    ['priority: \\"a # b', '\\"a'],
    ['priority: \\x"a # b', '\\x"a # b'],
    ["priority:", null],
    ["priority:   ", null],
    ["priority: true", null],
    ["priority: false", null],
    ["priority: 12", null],
    ["priority: -3", null],
    ["priority: 12a", "12a"],
    ["priority: a12", "a12"],
    ["priorityX", null],
    ["other: must", null],
  ])("%s -> %p", (line, expected) => {
    expect(priorityOf(line)).toBe(expected);
  });

  test("frontmatter must start the file", () => {
    expect(
      getRequirementPriority(doc("x\n---\npriority: must\n---\n")),
    ).toBeNull();
  });

  test("whitespace after the opening fence, CRLF and BOM are accepted", () => {
    expect(getRequirementPriority(doc("---  \npriority: must\n---\n"))).toBe(
      "must",
    );
    expect(
      getRequirementPriority(doc("﻿---\r\npriority: must\r\n---\r\n")),
    ).toBe("must");
  });

  test("no frontmatter has no priority", () => {
    expect(getRequirementPriority(doc("# just text\n"))).toBeNull();
    expect(isMustPriorityRequirement(doc("# just text\n"))).toBe(false);
  });

  test("isMustPriorityRequirement only accepts must", () => {
    expect(isMustPriorityRequirement(doc("---\npriority: must\n---\n"))).toBe(
      true,
    );
    expect(isMustPriorityRequirement(doc("---\npriority: should\n---\n"))).toBe(
      false,
    );
  });

  test("relative paths resolve against the worktree, absolute ones do not", () => {
    const file = doc("---\npriority: must\n---\n");
    const name = path.basename(file);
    expect(getRequirementPriority(name, dir)).toBe("must");
    expect(isMustPriorityRequirement(name, dir)).toBe(true);
    expect(getRequirementPriority(file, "/nonexistent-root")).toBe("must");
    expect(isMustPriorityRequirement(file, "/nonexistent-root")).toBe(true);
  });

  test("a relative path without a worktree is read as given", () => {
    expect(getRequirementPriority("no-such-requirement.md")).toBeNull();
    expect(isMustPriorityRequirement("no-such-requirement.md")).toBe(false);
  });

  test("an unreadable file has no priority", () => {
    expect(getRequirementPriority(path.join(dir, "missing.md"))).toBeNull();
    expect(isMustPriorityRequirement(dir)).toBe(false);
  });
});
