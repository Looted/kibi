import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { mergeKbManifests } from "../../src/commands/merge-driver.js";
import { spawnSync } from "../helpers/isolated-env.js";

const kibiBin = path.resolve(__dirname, "../../bin/kibi");

const HEADER = "# symbols.yaml\n# AUTHORED fields (edit freely)\n";

function manifest(...entries: string[]): string {
  return `${HEADER}symbols:\n${entries.join("")}`;
}

function symbol(id: string, extra = "", relationships: string[] = []): string {
  const rels =
    relationships.length > 0
      ? `    relationships:\n${relationships
          .map(
            (target) => `      - type: implements\n        target: ${target}\n`,
          )
          .join("")}`
      : "";
  return `  - id: ${id}\n    title: ${id}\n    sourceFile: src/${id}.ts\n${extra}${rels}`;
}

function ids(content: string): string[] {
  return (parse(content).symbols as { id: string }[]).map((entry) => entry.id);
}

function merged(base: string, ours: string, theirs: string): string {
  const result = mergeKbManifests(base, ours, theirs);
  if (result.status !== "merged") {
    throw new Error(`expected merge, got ${result.conflicts.join("; ")}`);
  }
  return result.content;
}

describe("mergeKbManifests", () => {
  test("keeps symbols both sides appended at the end of the list", () => {
    const base = manifest(symbol("SYM-a"));
    const ours = manifest(symbol("SYM-a"), symbol("SYM-ours"));
    const theirs = manifest(symbol("SYM-a"), symbol("SYM-theirs"));

    const content = merged(base, ours, theirs);

    expect(ids(content)).toEqual(["SYM-a", "SYM-ours", "SYM-theirs"]);
    expect(content.startsWith(HEADER)).toBe(true);
  });

  test("reproduces the input bytes when nothing changed", () => {
    const text = manifest(symbol("SYM-a"), symbol("SYM-b"));

    expect(merged(text, text, text)).toBe(text);
  });

  test("applies a one-sided edit and a one-sided deletion", () => {
    const base = manifest(symbol("SYM-a"), symbol("SYM-b"));
    const ours = manifest(
      symbol("SYM-a", "    status: deprecated\n"),
      symbol("SYM-b"),
    );
    const theirs = manifest(symbol("SYM-a"));

    const content = merged(base, ours, theirs);

    expect(ids(content)).toEqual(["SYM-a"]);
    expect(parse(content).symbols[0].status).toBe("deprecated");
  });

  test("unions relationships both sides added to the same symbol", () => {
    const base = manifest(symbol("SYM-a", "", ["REQ-base"]));
    const ours = manifest(symbol("SYM-a", "", ["REQ-base", "REQ-ours"]));
    const theirs = manifest(symbol("SYM-a", "", ["REQ-base", "REQ-theirs"]));

    const content = merged(base, ours, theirs);

    expect(
      parse(content).symbols[0].relationships.map(
        (rel: { target: string }) => rel.target,
      ),
    ).toEqual(["REQ-base", "REQ-ours", "REQ-theirs"]);
  });

  test("reports a scalar both sides changed differently", () => {
    const base = manifest(symbol("SYM-a"));
    const ours = manifest(symbol("SYM-a", "    status: active\n"));
    const theirs = manifest(symbol("SYM-a", "    status: deprecated\n"));

    expect(mergeKbManifests(base, ours, theirs)).toEqual({
      status: "conflict",
      conflicts: ["SYM-a: both sides changed status"],
    });
  });

  test("reports an edit on one side of a symbol the other side deleted", () => {
    const base = manifest(symbol("SYM-a"), symbol("SYM-b"));
    const ours = manifest(symbol("SYM-a"));
    const theirs = manifest(
      symbol("SYM-a"),
      symbol("SYM-b", "    status: deprecated\n"),
    );

    expect(mergeKbManifests(base, ours, theirs)).toEqual({
      status: "conflict",
      conflicts: ["SYM-b: deleted on ours but changed on theirs"],
    });
  });

  test("merges relationship shards appended on both sides", () => {
    const rel = (id: string) =>
      `  - id: ${id}\n    type: implements\n    from: SYM-${id}\n    to: REQ-x\n`;
    const base = `relationships:\n${rel("a")}`;
    const ours = `relationships:\n${rel("a")}${rel("b")}`;
    const theirs = `relationships:\n${rel("a")}${rel("c")}`;

    const content = merged(base, ours, theirs);

    expect(
      (parse(content).relationships as { id: string }[]).map((r) => r.id),
    ).toEqual(["a", "b", "c"]);
  });

  test("refuses to merge a manifest with duplicate ids", () => {
    const base = manifest(symbol("SYM-a"));
    const ours = manifest(symbol("SYM-a"), symbol("SYM-a"));

    expect(mergeKbManifests(base, ours, base).status).toBe("conflict");
  });
});

describe("kibi merge-driver", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-merge-driver-"));
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  function git(...args: string[]) {
    const result = spawnSync("git", args, { cwd: tmpDir, encoding: "utf-8" });
    return result;
  }

  function commitManifest(content: string, message: string) {
    fs.writeFileSync(path.join(tmpDir, ".kb/symbols.yaml"), content);
    git("add", ".");
    git("commit", "-q", "-m", message);
  }

  test("resolves a git merge where both branches appended symbols", () => {
    git("init", "-q", "-b", "develop");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Kibi Test");
    git("config", "merge.kibi.driver", `bun ${kibiBin} merge-driver %O %A %B`);
    fs.mkdirSync(path.join(tmpDir, ".kb"));
    fs.writeFileSync(
      path.join(tmpDir, ".gitattributes"),
      ".kb/symbols.yaml merge=kibi\n.kb/relationships/*.yaml merge=kibi\n",
    );
    commitManifest(manifest(symbol("SYM-a")), "base");
    git("checkout", "-q", "-b", "feature");
    commitManifest(manifest(symbol("SYM-a"), symbol("SYM-feature")), "feature");
    git("checkout", "-q", "develop");
    commitManifest(manifest(symbol("SYM-a"), symbol("SYM-develop")), "develop");
    git("checkout", "-q", "feature");

    const result = git("merge", "--no-edit", "develop");

    expect(result.status).toBe(0);
    expect(
      ids(fs.readFileSync(path.join(tmpDir, ".kb/symbols.yaml"), "utf8")),
    ).toEqual(["SYM-a", "SYM-feature", "SYM-develop"]);
  });

  test("leaves conflict markers and exits non-zero on a real conflict", () => {
    const write = (name: string, content: string) => {
      const file = path.join(tmpDir, name);
      fs.writeFileSync(file, content);
      return file;
    };
    const base = write("base.yaml", manifest(symbol("SYM-a")));
    const current = write(
      "current.yaml",
      manifest(symbol("SYM-a", "    status: active\n")),
    );
    const other = write(
      "other.yaml",
      manifest(symbol("SYM-a", "    status: deprecated\n")),
    );

    const result = spawnSync(
      "bun",
      [kibiBin, "merge-driver", base, current, other],
      { cwd: tmpDir, encoding: "utf-8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SYM-a: both sides changed status");
    expect(fs.readFileSync(current, "utf8")).toContain("<<<<<<< ours");
  });
});
