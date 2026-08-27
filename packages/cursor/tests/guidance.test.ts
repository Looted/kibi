import { describe, expect, test } from "bun:test";

import {
  readGuidance,
  resolveKibiInterface,
  writeGuidance,
} from "../src/guidance";

const observedContext = {
  cwd: undefined,
  hasKibi: true,
  mcpState: "observed",
  workspaceTrusted: false,
} as const;

describe("Cursor guidance", () => {
  test("Given Kibi disabled When reading or writing Then guidance is omitted", () => {
    const context = { ...observedContext, hasKibi: false };
    expect(readGuidance("src/a.ts", context)).toBeUndefined();
    expect(writeGuidance("src/a.ts", context)).toBeUndefined();
  });

  test("Given untracked paths When reading or writing Then guidance is omitted", () => {
    expect(readGuidance("package.json", observedContext)).toBeUndefined();
    expect(writeGuidance("dist/index.js", observedContext)).toBeUndefined();
  });

  test("Given tracked paths When reading or writing Then path-specific guidance is returned", () => {
    const read = readGuidance("/repo/src/a.ts", {
      ...observedContext,
      cwd: "/repo",
    });
    expect(read).toContain('sourceFile="src/a.ts"');
    expect(read).toContain("MCP or CLI JSON route");
    expect(writeGuidance(".kb/requirements/REQ.md", observedContext)).toContain(
      "keep REQ, SCEN, and TEST artifacts separate",
    );
    const write = writeGuidance("src/a.ts", observedContext);
    expect(write).toContain('sourceFiles:["src/a.ts"]');
    expect(write).toContain("MCP or CLI JSON route");
  });

  test("routes only observed MCP and trusted unknown workspaces to usable interfaces", () => {
    expect(resolveKibiInterface("observed", false)).toBe("mcp");
    expect(resolveKibiInterface("observed", true)).toBe("mcp");
    expect(resolveKibiInterface("unknown", true)).toBe("cli");
    expect(resolveKibiInterface("unknown", false)).toBe("setup");
  });
});
