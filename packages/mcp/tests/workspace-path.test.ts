import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  normalizeRepoRelativePath,
  resolveWorkspaceSourceAbsolute,
} from "../src/workspace-path.js";

describe("mcp workspace-path confinement", () => {
  test("resolves in-workspace files and refuses outside escapes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-mcp-ws-"));
    const outside = mkdtempSync(path.join(tmpdir(), "kibi-mcp-out-"));
    try {
      mkdirSync(path.join(root, "src"), { recursive: true });
      const file = path.join(root, "src", "in.ts");
      writeFileSync(file, "export const inScope = 1;\n", "utf8");
      const secret = path.join(outside, "secret.ts");
      writeFileSync(secret, 'export const API_SECRET_TOKEN = "x";\n', "utf8");

      expect(normalizeRepoRelativePath(root, "src/in.ts")).toBe("src/in.ts");
      expect(resolveWorkspaceSourceAbsolute(root, "src/in.ts")).toBe(
        realpathSync.native(file),
      );
      expect(resolveWorkspaceSourceAbsolute(root, secret)).toBeNull();
      expect(resolveWorkspaceSourceAbsolute(root, "/etc/passwd")).toBeNull();
      expect(
        resolveWorkspaceSourceAbsolute(root, "../" + path.basename(outside)),
      ).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
