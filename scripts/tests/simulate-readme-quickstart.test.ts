// executable_for TEST-prolog-bundled-quickstart
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  packedTarballs,
  parseArgs,
  quickStartCommands,
  substituteTarballs,
} from "../simulate-readme-quickstart.mjs";

const ROOT = path.join(import.meta.dir, "..", "..");
const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-readme-sim-"));
  created.push(dir);
  return dir;
}

describe("README quick start extraction", () => {
  test("reads the install and init commands out of the real README", () => {
    expect(quickStartCommands(readme)).toEqual([
      "npm install --save-dev kibi-core kibi-cli kibi-mcp",
      "npm exec -- kibi init",
    ]);
  });

  test("refuses a README with no quick start or no commands", () => {
    expect(() => quickStartCommands("# Kibi\n")).toThrow("no Quick start");
    expect(() => quickStartCommands("## Quick start\n\nprose only\n")).toThrow(
      "no bash code block",
    );
    expect(() =>
      quickStartCommands("## Quick start\n\n```bash\n# nothing\n```\n"),
    ).toThrow("holds no commands");
  });

  test("only reads the first code block of the quick start section", () => {
    const text =
      "## Quick start\n\n```bash\nnpm i kibi-cli\n```\n\n```bash\nrm -rf /\n```\n\n## Next\n\n```bash\nno\n```\n";
    expect(quickStartCommands(text)).toEqual(["npm i kibi-cli"]);
  });
});

describe("tarball substitution", () => {
  const tarballs = {
    "kibi-core": "/t/kibi-core-1.tgz",
    "kibi-cli": "/t/kibi-cli-1.tgz",
  };

  test("swaps packed package names in an npm install and leaves flags alone", () => {
    const { command, direct } = substituteTarballs(
      "npm install --save-dev kibi-core kibi-cli kibi-mcp",
      tarballs,
    );
    expect(command).toBe(
      'npm install --save-dev "/t/kibi-core-1.tgz" "/t/kibi-cli-1.tgz" kibi-mcp',
    );
    expect(direct).toEqual(["kibi-core", "kibi-cli"]);
  });

  test("does not touch commands that are not an npm install", () => {
    expect(substituteTarballs("npm exec -- kibi init", tarballs)).toEqual({
      command: "npm exec -- kibi init",
      direct: [],
    });
  });
});

describe("packed tarball discovery", () => {
  test("maps package names to their tarball and refuses ambiguity", () => {
    const root = tempDir();
    const dir = path.join(root, "swipl");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "package.json"), '{"name":"kibi-swipl"}');
    writeFileSync(path.join(dir, "kibi-swipl-1.0.0.tgz"), "x");
    mkdirSync(path.join(root, "no-tarball"));
    expect(packedTarballs(root)).toEqual({
      "kibi-swipl": path.join(dir, "kibi-swipl-1.0.0.tgz"),
    });
    writeFileSync(path.join(dir, "kibi-swipl-1.0.1.tgz"), "x");
    expect(() => packedTarballs(root)).toThrow("more than one tarball");
  });
});

describe("command line", () => {
  test("requires a tarballs directory", () => {
    expect(() => parseArgs([])).toThrow("usage: simulate-readme-quickstart");
    expect(parseArgs(["--tarballs", "p"]).packagesDir).toBe("p");
    expect(() => parseArgs(["--bogus"])).toThrow("unknown argument");
  });

  test("fails fast, naming the missing platform tarball", () => {
    const root = tempDir();
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, "scripts", "simulate-readme-quickstart.mjs"),
        "--tarballs",
        root,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/no kibi-swipl-.* tarball under/);
  });
});
