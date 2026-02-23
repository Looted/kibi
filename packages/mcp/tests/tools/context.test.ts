import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbContext } from "../../src/tools/context.js";

describe("MCP Context Tool", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-context");

    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });

    prolog = new PrologProcess();
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    const attachResult = await prolog.query(`kb_attach('${testKbPath}')`);
    expect(attachResult.success).toBe(true);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }

    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  describe("kbcontext", () => {
    test("should return entities for known source file", async () => {
      const result = await handleKbContext(prolog, {
        sourceFile: "src/features/feature.ts",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent?.sourceFile).toBe(
        "src/features/feature.ts",
      );
      expect(result.structuredContent?.entities).toBeInstanceOf(Array);
      expect(result.structuredContent?.provenance).toEqual({
        predicate: "kb_entities_by_source",
        deterministic: true,
      });
    });

    test("should return empty array for unknown path", async () => {
      const result = await handleKbContext(prolog, {
        sourceFile: "nonexistent/path/to/file.ts",
      });

      expect(result.structuredContent?.entities).toEqual([]);
      expect(result.structuredContent?.relationships).toEqual([]);
    });

    test("should include first-hop relationships", async () => {
      const result = await handleKbContext(prolog, {
        sourceFile: "src/features/feature.ts",
      });

      if (
        result.structuredContent?.entities &&
        result.structuredContent.entities.length > 0
      ) {
        expect(result.structuredContent?.relationships).toBeInstanceOf(Array);
      }
    });

    test("should return error when branch parameter is mismatched", async () => {
      const result = await handleKbContext(
        prolog,
        {
          sourceFile: "src/features/feature.ts",
          branch: "wrong-branch",
        },
        "develop",
      );

      expect(result.content[0].text).toContain(
        "branch parameter is not supported server-side",
      );
      expect(result.content[0].text).toContain("Requested: wrong-branch");
      expect(result.content[0].text).toContain("Active: develop");
      expect(result.structuredContent).toBeUndefined();
    });

    test("should work normally when branch parameter matches", async () => {
      const result = await handleKbContext(
        prolog,
        {
          sourceFile: "src/features/feature.ts",
          branch: "develop",
        },
        "develop",
      );

      expect(result.content[0].text).not.toContain(
        "branch parameter is not supported server-side",
      );
      expect(result.structuredContent).toBeDefined();
    });

    test("should work normally when branch parameter is omitted", async () => {
      const result = await handleKbContext(
        prolog,
        {
          sourceFile: "src/features/feature.ts",
        },
        "develop",
      );

      expect(result.content[0].text).not.toContain(
        "branch parameter is not supported server-side",
      );
      expect(result.structuredContent).toBeDefined();
    });
  });
});
