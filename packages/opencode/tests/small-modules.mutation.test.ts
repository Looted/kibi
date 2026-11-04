import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildKibiBootstrapAlias } from "../src/kibi-bootstrap-alias";
import { analyzePath } from "../src/path-kind";
import { sendToast } from "../src/toast";
import { checkWorkspaceHealth } from "../src/workspace-health";

describe("buildKibiBootstrapAlias", () => {
  test("renders the exact route text", () => {
    expect(buildKibiBootstrapAlias()).toBe(
      [
        "# /kibi-bootstrap",
        "",
        "Bootstrap Kibi knowledge for an existing repository.",
        "",
        "## Route",
        "If Kibi infrastructure is missing, run `kibi init` first.",
        "Then invoke the canonical `kibi-bootstrap` skill. OpenCode may expose this route as a native command or as `/kibi:kibi-bootstrap:mcp`; use whichever host syntax is available.",
      ].join("\n"),
    );
  });
});

describe("analyzePath", () => {
  test("a KB lane wins over a test-looking file name", () => {
    expect(analyzePath(".kb/requirements/foo.test.md", "/r")).toStrictEqual({
      kind: "requirement",
      isUnderKb: true,
      isKibiDocRelevant: true,
    });
  });

  test("a top-level tests/ directory is a test path", () => {
    expect(analyzePath("tests/notes.md", "/r").kind).toBe("test");
    expect(analyzePath("src/tests/notes.md", "/r").kind).toBe("unknown");
  });

  test("the test-file pattern is anchored at both ends", () => {
    expect(analyzePath("foo.test.ts", "/r").kind).toBe("test");
    expect(analyzePath("src/foo.test.x.y", "/r").kind).toBe("unknown");
  });
});

describe("sendToast over the SDK", () => {
  const realSetTimeout = globalThis.setTimeout;
  afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
  });

  test.each([undefined, {}])(
    "a synchronous showToast result (%p) is delivered without a timeout",
    async (returned) => {
      let timers = 0;
      globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
        timers += 1;
        return realSetTimeout(...args);
      }) as typeof setTimeout;
      const result = await sendToast(
        {
          tui: {
            showToast: () => returned as undefined,
          },
        },
        { message: "hi" },
      );
      expect(result).toStrictEqual({ status: "delivered", transport: "sdk" });
      expect(timers).toBe(0);
    },
  );
});

describe("checkWorkspaceHealth", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function repo(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-health-"));
    dirs.push(dir);
    // Non-empty workspace root: only .kb itself is KB evidence.
    fs.writeFileSync(path.join(dir, "README.md"), "x");
    return dir;
  }

  const LANES = [
    ".kb/requirements",
    ".kb/scenarios",
    ".kb/tests",
    ".kb/adr",
    ".kb/flags",
    ".kb/events",
    ".kb/facts",
  ];

  function partial(missing: number): string {
    const dir = repo();
    fs.mkdirSync(path.join(dir, ".kb"));
    fs.writeFileSync(path.join(dir, ".kb", "manifest.json"), "{}");
    fs.writeFileSync(path.join(dir, ".kb", "symbols.yaml"), "[]");
    for (const lane of LANES.slice(missing)) {
      fs.mkdirSync(path.join(dir, lane));
    }
    return dir;
  }

  test("no .kb directory is no KB evidence", () => {
    expect(checkWorkspaceHealth(repo()).hasKbEvidence).toBe(false);
  });

  test("an empty .kb directory is no KB evidence", () => {
    const dir = repo();
    fs.mkdirSync(path.join(dir, ".kb"));
    expect(checkWorkspaceHealth(dir).hasKbEvidence).toBe(false);
  });

  test("a partial root KB needs bootstrap only past two missing targets", () => {
    const two = checkWorkspaceHealth(partial(2));
    expect(two.missingDocDirs).toStrictEqual([
      ".kb/requirements",
      ".kb/scenarios",
    ]);
    expect(two.needsBootstrap).toBe(false);
    expect(two.hasKbEvidence).toBe(true);
    expect(checkWorkspaceHealth(partial(3)).needsBootstrap).toBe(true);
  });
});
