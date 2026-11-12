import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fetchUnitResults, main } from "../ci-unit-results";

const repository = "Looted/kibi";
const sha = "a".repeat(40);

// gh stand-in: `api` prints <name>.<n>.json (n = call count) or <name>.json;
// `run download` copies ledger.json into --dir as test-results.json.
const FAKE_GH = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const fixture = process.env.KIBI_GH_FIXTURE;
const args = process.argv.slice(2);
function next(name) {
  const counter = path.join(fixture, name + ".count");
  const count = fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) : 0;
  fs.writeFileSync(counter, String(count + 1));
  const numbered = path.join(fixture, name + "." + count + ".json");
  return fs.existsSync(numbered) ? numbered : path.join(fixture, name + ".json");
}
if (args[0] === "api") {
  const name = args[1].includes("/artifacts?") ? "artifacts" : "runs";
  process.stdout.write(fs.readFileSync(next(name), "utf8"));
} else if (args[0] === "run" && args[1] === "download") {
  const output = args[args.indexOf("--dir") + 1];
  fs.copyFileSync(path.join(fixture, "ledger.json"), path.join(output, "test-results.json"));
} else process.exit(2);
`;

const created: string[] = [];
const savedEnv = { ...process.env };
let fixture: string;
let out: string;
let logs: string[];

function writeJson(name: string, value: unknown): void {
  writeFileSync(path.join(fixture, `${name}.json`), JSON.stringify(value));
}

function ciRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 41,
    head_sha: sha,
    event: "push",
    status: "completed",
    conclusion: "success",
    ...overrides,
  };
}

function artifact(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    name: "unit-test-results",
    expired: false,
    size_in_bytes: 100,
    ...overrides,
  };
}

beforeEach(() => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-results-gh-"));
  created.push(root);
  fixture = path.join(root, "fixture");
  mkdirSync(fixture);
  const bin = path.join(root, "bin");
  mkdirSync(bin);
  writeFileSync(path.join(bin, "gh"), FAKE_GH);
  chmodSync(path.join(bin, "gh"), 0o755);
  out = path.join(root, "results.json");
  process.env.PATH = `${bin}${path.delimiter}${savedEnv.PATH}`;
  process.env.KIBI_GH_FIXTURE = fixture;
  process.env.KIBI_UNIT_RESULTS_POLL_SECONDS = "0";
  process.env.GITHUB_REPOSITORY = repository;
  process.env.CI_HEAD_SHA = sha;
  process.env.PR_HEAD_REPOSITORY = "";
  writeJson("runs", { workflow_runs: [ciRun()] });
  writeJson("artifacts", { artifacts: [artifact()] });
  writeJson("ledger", { version: 1, files: [] });
  logs = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
});

afterEach(() => {
  (console.log as unknown as { mockRestore(): void }).mockRestore();
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function written(): unknown {
  return JSON.parse(readFileSync(out, "utf8"));
}

describe("fetching CI unit results", () => {
  test("downloads the ledger of the newest CI run", async () => {
    expect(await main(["fetch", out])).toBe(0);
    expect(written()).toStrictEqual({ version: 1, files: [] });
    expect(logs).toStrictEqual([
      "Unit test results: downloaded from CI run 41",
    ]);
  });

  test("an oversized ledger is unavailable", async () => {
    writeFileSync(
      path.join(fixture, "ledger.json"),
      " ".repeat(8 * 1024 * 1024 + 1),
    );
    expect(await main(["fetch", out])).toBe(0);
    expect(written()).toStrictEqual({
      unavailable: "CI unit results are too large",
    });
  });

  test("a finished run without results stops the wait", async () => {
    writeJson("artifacts", { artifacts: [] });
    writeJson("runs", { workflow_runs: [ciRun({ conclusion: "failure" })] });
    await main(["fetch", out]);
    expect(written()).toStrictEqual({
      unavailable: "CI run 41 finished (failure) without unit test results",
    });
  });

  test("waits for a run to appear and publish its results", async () => {
    writeJson("runs.0", { workflow_runs: [] });
    writeJson("runs.1", { workflow_runs: [ciRun({ status: "in_progress" })] });
    writeJson("artifacts.0", { artifacts: [] });
    process.env.KIBI_UNIT_RESULTS_WAIT_SECONDS = "";
    await main(["fetch", out]);
    expect(written()).toStrictEqual({ version: 1, files: [] });
  });

  test("gives up when no run appears or the run publishes nothing in time", async () => {
    process.env.KIBI_UNIT_RESULTS_WAIT_SECONDS = "0";
    writeJson("runs", { workflow_runs: [] });
    expect(
      await fetchUnitResults(out, {
        repository,
        headRepository: repository,
        sha,
      }),
    ).toBe("no CI run for this commit");
    writeJson("runs", { workflow_runs: [ciRun({ status: "queued" })] });
    writeJson("artifacts", { artifacts: [] });
    expect(
      await fetchUnitResults(out, {
        repository,
        headRepository: repository,
        sha,
      }),
    ).toBe("CI run 41 published no unit test results within 0s");
  });

  test("an invalid wait or poll setting makes results unavailable", async () => {
    for (const [name, value] of [
      ["KIBI_UNIT_RESULTS_WAIT_SECONDS", "-5"],
      ["KIBI_UNIT_RESULTS_POLL_SECONDS", "never"],
    ] as const) {
      process.env.KIBI_UNIT_RESULTS_WAIT_SECONDS = "1";
      process.env.KIBI_UNIT_RESULTS_POLL_SECONDS = "0";
      process.env[name] = value;
      await main(["fetch", out]);
      expect(written()).toStrictEqual({
        unavailable: `${name} must be a non-negative number of seconds`,
      });
    }
  });

  test("refuses another repository's change without calling GitHub", async () => {
    process.env.PR_HEAD_REPOSITORY = "someone/fork";
    writeFileSync(path.join(fixture, "runs.json"), "not JSON");
    await main(["fetch", out]);
    expect(written()).toStrictEqual({
      unavailable: "the change comes from another repository",
    });
  });

  test("missing repository and commit settings are refused", async () => {
    Reflect.deleteProperty(process.env, "GITHUB_REPOSITORY");
    Reflect.deleteProperty(process.env, "CI_HEAD_SHA");
    await main(["fetch", out]);
    expect(written()).toStrictEqual({ unavailable: "repository is unknown" });
    process.env.GITHUB_REPOSITORY = repository;
    await main(["fetch", out]);
    expect(written()).toStrictEqual({ unavailable: "commit SHA is invalid" });
  });
});
