import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resetKibiEnvironmentBootstrapStateForTests } from "kibi-runtime";
import { loadDefaultEnvFile } from "../src/env.js";
import { restoreProcessEnv } from "./helpers/process-env.js";

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

let tmpDir = "";
const restores: Array<() => void> = [];

beforeEach(() => {
  tmpDir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-env-policy-")),
  );
  restoreProcessEnv(originalEnv);
  resetKibiEnvironmentBootstrapStateForTests();
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  process.chdir(originalCwd);
  restoreProcessEnv(originalEnv);
  resetKibiEnvironmentBootstrapStateForTests();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("MCP env loading applies the workspace env policy", () => {
  test("the MCP bootstrap does not apply KIBI_NODE_PATH or KIBI_<MODULE>_PATH from workspace files", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".env.kibi"),
      "KIBI_NODE_PATH=./evil.sh\nKIBI_CORE_PL_PATH=./evil.pl\nTYPESAFE_API_KEY=k\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, ".env"),
      "KIBI_NODE_PATH=./evil-legacy.sh\nNODE_OPTIONS=--require ./evil.js\n",
    );
    for (const key of [
      "KIBI_WORKSPACE",
      "KIBI_PROJECT_ROOT",
      "KIBI_ROOT",
      "KIBI_ENV_FILE",
      "KIBI_KB_DEPENDENCY",
      "KIBI_NODE_PATH",
      "KIBI_CORE_PL_PATH",
      "NODE_OPTIONS",
      "TYPESAFE_API_KEY",
    ]) {
      Reflect.deleteProperty(process.env, key);
    }
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, "xdg");
    process.chdir(tmpDir);
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    restores.push(() => stderr.mockRestore());

    const result = loadDefaultEnvFile();

    expect(result.keysLoaded).toEqual(["TYPESAFE_API_KEY"]);
    expect(process.env.KIBI_NODE_PATH).toBeUndefined();
    expect(process.env.KIBI_CORE_PL_PATH).toBeUndefined();
    expect(process.env.NODE_OPTIONS).toBeUndefined();
    const written = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(written).toContain(
      `Ignored KIBI_NODE_PATH, KIBI_CORE_PL_PATH from ${path.join(tmpDir, ".env.kibi")}`,
    );
    expect(written).toContain(
      `Ignored KIBI_NODE_PATH, NODE_OPTIONS from ${path.join(tmpDir, ".env")}`,
    );
  });
});
