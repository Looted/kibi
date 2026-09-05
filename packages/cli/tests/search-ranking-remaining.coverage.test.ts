// implements REQ-mcp-search-discovery
// implements REQ-002
// implements REQ-003
// implements REQ-007
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs/promises";
import { isolateKibiEnv } from "./helpers/in-process-workspace.ts";
import { loadMarkdownBody, rankEntities } from "../src/search-ranking.js";

const spies: Array<{ mockRestore: () => void }> = [];
let restoreEnv: (() => void) | undefined;

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  restoreEnv?.();
  restoreEnv = undefined;
});

describe("search-ranking remaining query, body, and snippet branches", () => {
  test("stop-word-only queries and non-array tags produce no matches", async () => {
    restoreEnv = isolateKibiEnv();
    expect(
      await rankEntities(
        [{ id: "REQ-1", title: "The logged user" }],
        "the a an is",
        "/workspace",
      ),
    ).toEqual([]);
    expect(
      await rankEntities(
        [{ id: "REQ-2", title: "Other", tags: "security" }],
        "security",
        "/workspace",
      ),
    ).toEqual([]);
  });

  test("compact phrase matches, simple plurals, and missing fields still rank", async () => {
    restoreEnv = isolateKibiEnv();
    const matches = await rankEntities(
      [
        {
          id: "REQ-CLASS",
          title: "classnames",
        },
        {
          title: "status",
          type: "req",
        },
      ],
      "class-names",
      "/workspace",
    );
    expect(matches[0]?.reasons).toEqual(
      expect.arrayContaining(["exact title match"]),
    );
    expect(
      await rankEntities(
        [{ id: "REQ-BUS", title: "buses and classes and this" }],
        "buses classes this",
        "/workspace",
      ),
    ).toHaveLength(1);
  });

  test("inline bodies, token coverage, and long snippets are used when files are absent", async () => {
    restoreEnv = isolateKibiEnv();
    const longLine = `checkout ${"word ".repeat(80)}omega`;
    const matches = await rankEntities(
      [
        {
          id: "REQ-BODY",
          title: "Unrelated title",
          markdownBody: "The checkout cart token lives here",
        },
        {
          id: "REQ-CONTENT",
          title: "Still unrelated",
          content: longLine,
        },
        {
          id: "REQ-MD",
          title: "Also unrelated",
          markdown_body: "\n\n",
          body: "fallback body checkout",
        },
      ],
      "checkout",
      "/workspace",
    );
    expect(matches.some((match) => match.reasons.includes("markdown body match"))).toBe(
      true,
    );
    const long = matches.find((match) => match.entity.id === "REQ-CONTENT");
    expect(long?.snippet?.endsWith("...")).toBe(true);
    expect((long?.snippet ?? "").length).toBeLessThanOrEqual(160);
  });

  test("stripFrontmatter keeps content without a closing delimiter or opening match", async () => {
    restoreEnv = isolateKibiEnv();
    const unclosed = spyOn(fs, "readFile").mockResolvedValue(
      "---\ntitle: Open\nThis never closes",
    );
    spies.push(unclosed);
    expect(await loadMarkdownBody("docs/open.md", "/workspace")).toBe(
      "---\ntitle: Open\nThis never closes",
    );
    unclosed.mockRestore();

    const noNewline = spyOn(fs, "readFile").mockResolvedValue("---title: x");
    spies.push(noNewline);
    expect(await loadMarkdownBody("docs/tight.md", "/workspace")).toBe(
      "---title: x",
    );
    noNewline.mockRestore();

    const plain = spyOn(fs, "readFile").mockResolvedValue("plain body checkout");
    spies.push(plain);
    const ranked = await rankEntities(
      [
        {
          id: "REQ-FILE",
          title: "Unrelated",
          source: "docs/plain.md",
        },
      ],
      "checkout",
      "/workspace",
    );
    expect(ranked[0]?.reasons).toContain("markdown body match");
  });

  test("body token coverage is used when the full phrase is absent", async () => {
    restoreEnv = isolateKibiEnv();
    const matches = await rankEntities(
      [
        {
          id: "REQ-TOKENS",
          title: "Something else",
          body: "alpha beta gamma",
        },
      ],
      "alpha zeta",
      "/workspace",
    );
    expect(matches[0]?.reasons).toContain("markdown body token coverage");
    expect(matches[0]?.snippet).toBe("alpha beta gamma");
  });
});
