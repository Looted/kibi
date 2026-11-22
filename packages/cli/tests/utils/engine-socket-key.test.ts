import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { engineSocketPath } from "../../src/engine.js";
import { canonicalFilesystemPath } from "../../src/utils/canonical-path.js";
import { engineSocketKey } from "../../src/utils/engine-socket-key.js";

describe("engineSocketKey", () => {
  test("is the first 128 bits of sha256(root NUL branch) in hex", () => {
    expect(engineSocketKey("/work/repo", "main")).toBe(
      "11301892a9a248ff6ecf541213841304",
    );
    expect(engineSocketKey("/work/repo", "main")).not.toBe(
      engineSocketKey("/work/repo", "dev"),
    );
    expect(engineSocketKey("/work/repo", "main")).not.toBe(
      engineSocketKey("/work/other", "main"),
    );
  });

  test("names the socket the engine binds for a workspace and branch", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-socket-key-"));
    try {
      const key = engineSocketKey(canonicalFilesystemPath(root), "main");
      const socket = engineSocketPath(root, "main");
      expect(
        process.platform === "win32"
          ? socket === `\\\\.\\pipe\\kibi-${key}`
          : path.basename(socket) === `kibi-${key}.sock`,
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
