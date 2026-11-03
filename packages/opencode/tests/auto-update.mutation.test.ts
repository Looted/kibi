import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { findKibiOpencodePluginEntry } from "../src/auto-update.js";

describe("findKibiOpencodePluginEntry", () => {
  test("non-string plugin entries are passed over", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-au-mut-"));
    try {
      fs.writeFileSync(
        path.join(dir, "opencode.json"),
        JSON.stringify({ plugin: [7, { name: "x" }, "kibi-opencode"] }),
      );
      expect(findKibiOpencodePluginEntry(dir)).toEqual({
        entry: "kibi-opencode",
        isPinned: false,
        requestedVersion: null,
        configPath: path.join(dir, "opencode.json"),
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
