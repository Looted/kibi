import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

mock.module("../../../packages/cli/src/engine", () => ({
  EngineClient: class {
    async stop() {}
    async terminate() {}
  },
}));

mock.module("../../../packages/cli/src/prolog.js", () => ({
  PrologProcess: class {
    async start() {}
    async terminate() {}
    async query() {
      return { success: true, bindings: {} };
    }
  },
}));

mock.module("../../../packages/cli/src/utils/branch-store-locator.js", () => ({
  branchStorePath: () => "/tmp/skillopt-fixture-store",
}));

const {
  FixtureSetupError,
  assertSymbolCoordinatesAbsent,
  assertSymbolCoordinatesPresent,
  fixtureCliEnv,
  initFixtureRepository,
  setupGeneratedCoordinateDivergence,
  setupSeededFreshKb,
  setupSeededStaleKb,
  setupThinRootKb,
  stopFixtureEngine,
  stripSymbolCoordinates,
} = await import("../runtime/fixture-kb-setup");

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeFakeCli(cliRoot: string, symbolId = "SYM-SETUP-FIXTURE"): void {
  mkdirSync(join(cliRoot, "dist"), { recursive: true });
  writeFileSync(
    join(cliRoot, "dist", "cli.js"),
    `const { mkdirSync, readFileSync, writeFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const args = process.argv.slice(2);
const cmd = args[0];
if (cmd === "query") {
  const countFile = join(process.cwd(), ".query-count");
  const n = Number(existsSync(countFile) ? readFileSync(countFile, "utf8") : "0") + 1;
  writeFileSync(countFile, String(n));
  const coords = n === 1
    ? { sourceLine: 1, sourceColumn: 8, sourceEndLine: 3, sourceEndColumn: 1 }
    : {};
  console.log(JSON.stringify([{ id: ${JSON.stringify(symbolId)}, ...coords }]));
  process.exit(0);
}
if (cmd === "init") {
  mkdirSync(join(process.cwd(), ".kb"), { recursive: true });
  process.exit(0);
}
if (cmd === "sync" || cmd === "upsert") process.exit(0);
console.error("unknown " + cmd);
process.exit(1);
`,
  );
}

describe("fixture-kb-setup", () => {
  test("coordinate assertions accept and reject the four literals", () => {
    const present = {
      id: "SYM-1",
      sourceLine: 1,
      sourceColumn: 1,
      sourceEndLine: 2,
      sourceEndColumn: 1,
    };
    assertSymbolCoordinatesPresent(present, "SYM-1");
    expect(() => assertSymbolCoordinatesPresent(present, "SYM-OTHER")).toThrow(
      FixtureSetupError,
    );
    const absent = { id: "SYM-1" };
    assertSymbolCoordinatesAbsent(absent, "SYM-1");
    expect(() =>
      assertSymbolCoordinatesAbsent(
        { ...absent, sourceLine: 1 },
        "SYM-1",
      ),
    ).toThrow(FixtureSetupError);
  });

  test("fixtureCliEnv pins workspace identity onto the evaluation branch", () => {
    const env = fixtureCliEnv("/tmp/fixture-ws");
    expect(env.KIBI_BRANCH).toBe("skillopt-eval");
    expect(env.KIBI_WORKSPACE).toBe("/tmp/fixture-ws");
  });

  test("initFixtureRepository creates the evaluation branch", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillopt-fixture-git-"));
    roots.push(root);
    await initFixtureRepository(root);
    expect(await Bun.file(join(root, ".git/HEAD")).text()).toContain(
      "skillopt-eval",
    );
  });

  test("setupThinRootKb, seeded fresh, and stale paths use the staged CLI", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillopt-fixture-kb-"));
    roots.push(root);
    const cliRoot = join(root, "cli");
    const workspace = join(root, "ws");
    mkdirSync(workspace, { recursive: true });
    writeFileSync(join(workspace, "README.md"), "fixture\n");
    writeFakeCli(cliRoot);
    await setupThinRootKb(workspace, cliRoot);

    const fresh = join(root, "fresh");
    mkdirSync(fresh, { recursive: true });
    await setupSeededFreshKb(fresh, cliRoot);
    const stale = join(root, "stale-copy");
    mkdirSync(stale, { recursive: true });
    await setupSeededStaleKb(stale, cliRoot);
  });

  test("setupGeneratedCoordinateDivergence drives the CLI then strips coordinates", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillopt-fixture-coord-"));
    roots.push(root);
    const cliRoot = join(root, "cli");
    const workspace = join(root, "ws");
    mkdirSync(join(workspace, "src"), { recursive: true });
    writeFakeCli(cliRoot, "SYM-COORD");
    await setupGeneratedCoordinateDivergence(workspace, cliRoot, "SYM-COORD");
  });

  test("stripSymbolCoordinates and stopFixtureEngine tolerate mocked daemons", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillopt-fixture-strip-"));
    roots.push(root);
    await stripSymbolCoordinates(root, {
      id: "SYM-1",
      sourceLine: 1,
      sourceColumn: 1,
      sourceEndLine: 2,
      sourceEndColumn: 1,
      title: "x",
    });
    await stopFixtureEngine(root);
  });

  test("setupThinRootKb throws when the staged CLI fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillopt-fixture-fail-"));
    roots.push(root);
    const cliRoot = join(root, "cli");
    const workspace = join(root, "ws");
    mkdirSync(workspace, { recursive: true });
    mkdirSync(join(cliRoot, "dist"), { recursive: true });
    writeFileSync(
      join(cliRoot, "dist", "cli.js"),
      "console.error('failed init'); process.exit(1);\n",
    );
    await expect(setupThinRootKb(workspace, cliRoot)).rejects.toThrow(
      FixtureSetupError,
    );
  });
});
