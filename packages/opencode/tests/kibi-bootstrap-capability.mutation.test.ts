import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  _resetKibiBootstrapCapabilityCacheForTests,
  getKibiBootstrapCommandCapability,
} from "../src/kibi-bootstrap-capability.js";

const dirs: string[] = [];
const originalCwd = process.cwd();

afterEach(() => {
  _resetKibiBootstrapCapabilityCacheForTests();
  process.chdir(originalCwd);
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("host capability inputs", () => {
  test("a host plugin without an SDK is passed over", () => {
    const root = fs.realpathSync(
      fs.mkdtempSync(path.join(tmpdir(), "kibi-boot-mut-")),
    );
    dirs.push(root);
    const pluginRoot = path.join(
      root,
      ".opencode",
      "node_modules",
      "@opencode-ai",
      "plugin",
    );
    fs.mkdirSync(pluginRoot, { recursive: true });
    fs.writeFileSync(
      path.join(pluginRoot, "package.json"),
      JSON.stringify({ name: "@opencode-ai/plugin", version: "9.9.9" }),
    );
    process.chdir(root);
    const capability = getKibiBootstrapCommandCapability();
    expect(capability.pluginVersion).not.toBe("9.9.9");
  });

  test("without an SDK beside the plugin the SDK is resolved directly", () => {
    const realExists = fs.existsSync;
    const exists = spyOn(fs, "existsSync").mockImplementation(
      (candidate: fs.PathLike) =>
        !String(candidate).includes(`${path.sep}sdk${path.sep}`) &&
        !String(candidate).includes(".opencode") &&
        realExists(candidate),
    );
    try {
      // The SDK is not installed where this package can resolve it, so the
      // lookup fails and leaves no inputs.
      expect(getKibiBootstrapCommandCapability()).toEqual({
        supported: false,
        reason:
          "@opencode-ai/plugin host Hooks definition is unavailable for config hook inspection.",
      });
    } finally {
      exists.mockRestore();
    }
  });
});
