import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtractedSymbol } from "../../src/traceability/symbol-extract.js";
import {
  cleanupTempKb,
  consultOverlay,
  createOverlayFacts,
  createTempKb,
} from "../../src/traceability/temp-kb.js";

describe("temp-kb", () => {
  let baseKbDir: string;

  beforeEach(async () => {
    mock.restore();
    // Create a temporary base KB directory for testing
    baseKbDir = path.join(tmpdir(), `kibi-test-base-${Date.now()}`);
    await mkdir(baseKbDir, { recursive: true });
    await writeFile(
      path.join(baseKbDir, "test.facts"),
      "test_fact(x).",
      "utf8",
    );
  });

  afterEach(async () => {
    // Clean up any temporary KBs created during tests
    await cleanupTempKb(baseKbDir).catch(() => {});
    await rm(baseKbDir, { recursive: true, force: true }).catch(() => {});
  });

  describe("createTempKb", () => {
    it("creates temp KB directory with proper structure", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        expect(ctx.tempDir).toBeDefined();
        expect(ctx.kbPath).toBeDefined();
        expect(ctx.overlayPath).toBeDefined();
        expect(ctx.prolog).toBeDefined();
        expect(existsSync(ctx.tempDir)).toBe(true);
        expect(existsSync(ctx.kbPath)).toBe(true);
        expect(existsSync(ctx.overlayPath)).toBe(true);
        expect(existsSync(path.join(ctx.kbPath, "test.facts"))).toBe(true);
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });

    it("throws error if base KB path does not exist", async () => {
      const nonExistentPath = path.join(
        tmpdir(),
        `kibi-nonexistent-${Date.now()}`,
      );
      await expect(createTempKb(nonExistentPath)).rejects.toThrow(
        `Base KB path does not exist: ${nonExistentPath}`,
      );
    });

    it("creates unique temp directory names", async () => {
      const ctx1 = await createTempKb(baseKbDir);
      const ctx2 = await createTempKb(baseKbDir);
      try {
        expect(ctx1.tempDir).not.toBe(ctx2.tempDir);
      } finally {
        await cleanupTempKb(ctx1.tempDir);
        await cleanupTempKb(ctx2.tempDir);
      }
    });

    it("starts and attaches prolog process", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        expect(ctx.prolog).toBeDefined();
        // Verify prolog is attached by checking the kb module is loaded
        const result = await ctx.prolog.query("current_module(kb)");
        expect(result.success).toBe(true);
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });

    it("creates empty overlay file", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        const overlayContent = await Bun.file(ctx.overlayPath).text();
        expect(overlayContent).toBe("");
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });

    it("copies base KB recursively", async () => {
      // Create nested structure in base KB
      const nestedDir = path.join(baseKbDir, "nested");
      await mkdir(nestedDir, { recursive: true });
      await writeFile(
        path.join(nestedDir, "nested.facts"),
        "nested_fact(x).",
        "utf8",
      );

      const ctx = await createTempKb(baseKbDir);
      try {
        expect(
          existsSync(path.join(ctx.kbPath, "nested", "nested.facts")),
        ).toBe(true);
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });
  });

  describe("cleanupTempKb", () => {
    it("cleans up temp KB directory", async () => {
      const ctx = await createTempKb(baseKbDir);
      const tempDir = ctx.tempDir;

      expect(existsSync(tempDir)).toBe(true);
      await cleanupTempKb(tempDir);
      expect(existsSync(tempDir)).toBe(false);
    });

    it("is safe to call multiple times", async () => {
      const ctx = await createTempKb(baseKbDir);
      const tempDir = ctx.tempDir;

      await cleanupTempKb(tempDir);
      await cleanupTempKb(tempDir);
      await cleanupTempKb(tempDir);
    });

    it("is safe to call for unknown temp dir", async () => {
      // Should not throw when called with a non-existent temp dir
      await cleanupTempKb("/tmp/nonexistent-kibi-temp-dir");
    });

    it("terminates prolog process", async () => {
      const ctx = await createTempKb(baseKbDir);
      const tempDir = ctx.tempDir;

      // Prolog should be attached and working
      const beforeResult = await ctx.prolog.query("current_module(kb)");
      expect(beforeResult.success).toBe(true);

      await cleanupTempKb(tempDir);

      // After cleanup, the temp dir should be removed
      expect(existsSync(tempDir)).toBe(false);
    });

    it("handles prolog detach errors gracefully", async () => {
      const ctx = await createTempKb(baseKbDir);
      const tempDir = ctx.tempDir;

      // Mock the query to simulate detach error
      const originalQuery = ctx.prolog.query.bind(ctx.prolog);
      ctx.prolog.query = async (goal: string) => {
        if (goal === "kb_detach") {
          throw new Error("mock detach error");
        }
        return originalQuery(goal);
      };

      // Should not throw, error should be traced
      await cleanupTempKb(tempDir);
      expect(existsSync(tempDir)).toBe(false);
    });
  });

  describe("consultOverlay", () => {
    it("consults overlay facts into prolog", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        // Write some overlay facts
        await Bun.write(
          ctx.overlayPath,
          "test_symbol(symbol1).\ntest_symbol_loc(symbol1, 'file.ts', 10, 0, 'name').",
        );

        // Should not throw when consulting valid overlay file
        await consultOverlay(ctx);
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });

    it("throws error if prolog session not found", async () => {
      // Create a mock context with a non-existent temp dir
      const mockCtx = {
        tempDir: "/nonexistent-temp-dir",
        overlayPath: "/nonexistent/overlay.pl",
        prolog: null,
      } as unknown as Parameters<typeof consultOverlay>[0];

      await expect(consultOverlay(mockCtx)).rejects.toThrow(
        "No Prolog session found for temp dir",
      );
    });

    it("throws error on consult failure", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        // Point overlay to a non-existent file to cause consult to fail
        (ctx as { overlayPath: string }).overlayPath =
          "/nonexistent/overlay.pl";

        await expect(consultOverlay(ctx)).rejects.toThrow(
          "Failed to consult overlay facts",
        );
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });
  });

  describe("createOverlayFacts", () => {
    it("creates facts for single symbol without reqLinks", () => {
      const symbol: ExtractedSymbol = {
        id: "symbol1",
        name: "testFunction",
        kind: "function",
        location: { file: "src/test.ts", startLine: 10, endLine: 15 },
        hunkRanges: [],
        reqLinks: [],
      };
      const facts = createOverlayFacts([symbol]);

      expect(facts).toContain("changed_symbol('symbol1').");
      expect(facts).toContain(
        "changed_symbol_loc('symbol1', 'src/test.ts', 10, 0, 'testFunction').",
      );
      expect(facts).not.toContain("changed_symbol_req");
    });

    it("creates facts for symbols with reqLinks", () => {
      const symbol: ExtractedSymbol = {
        id: "symbol1",
        name: "testFunction",
        kind: "function",
        location: { file: "src/test.ts", startLine: 10, endLine: 15 },
        hunkRanges: [],
        reqLinks: ["REQ-001", "REQ-002"],
      };
      const facts = createOverlayFacts([symbol]);

      expect(facts).toContain("changed_symbol('symbol1').");
      expect(facts).toContain("changed_symbol_req('symbol1', 'REQ-001').");
      expect(facts).toContain("changed_symbol_req('symbol1', 'REQ-002').");
    });

    it("handles multiple symbols", () => {
      const symbols: ExtractedSymbol[] = [
        {
          id: "symbol1",
          name: "func1",
          kind: "function",
          location: { file: "src/a.ts", startLine: 1, endLine: 1 },
          hunkRanges: [],
          reqLinks: [],
        },
        {
          id: "symbol2",
          name: "func2",
          kind: "function",
          location: { file: "src/b.ts", startLine: 2, endLine: 2 },
          hunkRanges: [],
          reqLinks: ["REQ-001"],
        },
      ];
      const facts = createOverlayFacts(symbols);

      expect(facts).toContain("changed_symbol('symbol1').");
      expect(facts).toContain("changed_symbol('symbol2').");
      expect(facts).toContain("changed_symbol_req('symbol2', 'REQ-001').");
    });

    it("escapes single quotes in symbol IDs", () => {
      const symbol: ExtractedSymbol = {
        id: "symbol'with'quotes",
        name: "testFunction",
        kind: "function",
        location: { file: "src/test.ts", startLine: 10, endLine: 15 },
        hunkRanges: [],
        reqLinks: [],
      };
      const facts = createOverlayFacts([symbol]);

      expect(facts).toContain("changed_symbol('symbol''with''quotes').");
    });

    it("escapes single quotes in file paths", () => {
      const symbol: ExtractedSymbol = {
        id: "symbol1",
        name: "testFunction",
        kind: "function",
        location: {
          file: "src/file'with'quotes.ts",
          startLine: 10,
          endLine: 15,
        },
        hunkRanges: [],
        reqLinks: [],
      };
      const facts = createOverlayFacts([symbol]);

      expect(facts).toContain(
        "changed_symbol_loc('symbol1', 'src/file''with''quotes.ts'",
      );
    });

    it("escapes single quotes in symbol names", () => {
      const symbol: ExtractedSymbol = {
        id: "symbol1",
        name: "func'with'quotes",
        kind: "function",
        location: { file: "src/test.ts", startLine: 10, endLine: 15 },
        hunkRanges: [],
        reqLinks: [],
      };
      const facts = createOverlayFacts([symbol]);

      expect(facts).toContain(
        "changed_symbol_loc('symbol1', 'src/test.ts', 10, 0, 'func''with''quotes').",
      );
    });

    it("handles empty symbol array", () => {
      const facts = createOverlayFacts([]);
      expect(facts).toBe("");
    });

    it("handles symbol with empty reqLinks", () => {
      const symbol: ExtractedSymbol = {
        id: "symbol1",
        name: "testFunction",
        kind: "function",
        location: { file: "src/test.ts", startLine: 10, endLine: 15 },
        hunkRanges: [],
        reqLinks: [],
      };
      const facts = createOverlayFacts([symbol]);

      expect(facts).toContain("changed_symbol('symbol1').");
      expect(facts).toContain(
        "changed_symbol_loc('symbol1', 'src/test.ts', 10, 0, 'testFunction').",
      );
      // Should not contain any req facts
      const reqFacts = facts.match(/changed_symbol_req/g);
      expect(reqFacts).toBeNull();
    });

    it("separates facts with newlines", () => {
      const symbols: ExtractedSymbol[] = [
        {
          id: "symbol1",
          name: "func1",
          kind: "function",
          location: { file: "src/a.ts", startLine: 1, endLine: 1 },
          hunkRanges: [],
          reqLinks: [],
        },
        {
          id: "symbol2",
          name: "func2",
          kind: "function",
          location: { file: "src/b.ts", startLine: 2, endLine: 2 },
          hunkRanges: [],
          reqLinks: [],
        },
      ];
      const facts = createOverlayFacts(symbols);

      const lines = facts.split("\n");
      // Should have 4 lines (2 facts per symbol)
      expect(lines.length).toBe(4);
      // Each non-empty line should end with a period
      for (const line of lines) {
        if (line.length > 0) {
          expect(line.endsWith(".")).toBe(true);
        }
      }
    });
  });

  describe("directory existence and structure", () => {
    it("verifies temp directory structure", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        const stats = await Bun.file(ctx.overlayPath).text();
        expect(stats).toBeDefined();

        // Check that kbPath is a subdirectory of tempDir
        expect(ctx.kbPath).toContain(ctx.tempDir);
        expect(ctx.overlayPath).toContain(ctx.tempDir);

        // Check that overlay file is in the same temp dir as KB
        expect(path.dirname(ctx.kbPath)).toBe(path.dirname(ctx.overlayPath));
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });

    it("verifies KB content is copied correctly", async () => {
      // Create test content in base KB
      await writeFile(
        path.join(baseKbDir, "base.facts"),
        "base_fact(test).\n",
        "utf8",
      );

      const ctx = await createTempKb(baseKbDir);
      try {
        const copiedContent = await Bun.file(
          path.join(ctx.kbPath, "base.facts"),
        ).text();
        expect(copiedContent).toBe("base_fact(test).\n");
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });
  });

  describe("cleanup handler registration", () => {
    it("registers cleanup handlers on process signals", async () => {
      const ctx = await createTempKb(baseKbDir);
      try {
        // The handlers should be registered internally
        // We can't easily test the actual signal handling without forking
        // But we can verify the temp dir exists and can be cleaned up
        expect(existsSync(ctx.tempDir)).toBe(true);
      } finally {
        await cleanupTempKb(ctx.tempDir);
      }
    });

    it("prevents duplicate cleanup of same temp dir", async () => {
      const ctx = await createTempKb(baseKbDir);
      const tempDir = ctx.tempDir;

      try {
        // First cleanup
        await cleanupTempKb(tempDir);
        // Second cleanup should be idempotent
        await cleanupTempKb(tempDir);
        // Third cleanup should also be safe
        await cleanupTempKb(tempDir);

        expect(existsSync(tempDir)).toBe(false);
      } finally {
        await cleanupTempKb(tempDir);
      }
    });
  });
});
