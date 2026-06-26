import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

const UPLOAD_SOURCE_FILE = "src/app/pages/upload/upload-page.component.ts";

function writeUploadSource(workspaceRoot: string): void {
  const absolutePath = path.join(workspaceRoot, UPLOAD_SOURCE_FILE);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(
    absolutePath,
    [
      "export class UploadPageComponent {",
      "  protected processingProgressLabel = computed(() => 'Processing started');",
      "}",
      "",
    ].join("\n"),
  );
}

function writeSymbolsManifest(workspaceRoot: string, content: string): void {
  const absolutePath = path.join(
    workspaceRoot,
    "documentation",
    "symbols.yaml",
  );
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

describe("MCP kb_check impact diagnostics", () => {
  let prolog: PrologProcess;
  let workspaceRoot: string;

  beforeAll(async () => {
    prolog = await startIntegrationProlog();
  });

  beforeEach(async () => {
    workspaceRoot = await createTestKbDir("kibi-mcp-check-impact-");
    const attachResult = await attachTestKb(prolog, workspaceRoot);
    expect(attachResult.success).toBe(true);
  });

  afterEach(async () => {
    await detachTestKb(prolog);
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await stopIntegrationProlog(prolog);
  });

  test("returns hard granularity and advisory semantic diagnostics for coarse class ownership", async () => {
    writeUploadSource(workspaceRoot);
    writeSymbolsManifest(
      workspaceRoot,
      `symbols:
  - id: SYM-UPLOAD-PAGE
    title: UploadPageComponent
    sourceFile: ${UPLOAD_SOURCE_FILE}
    links:
      - REQ-VIDEO-UPLOAD-PROGRESS
    relationships:
      - type: covered_by
        target: TEST-DASH-001
    status: active
`,
    );

    const result = await handleKbCheck(prolog, {
      workspaceRoot,
      sourceFiles: [UPLOAD_SOURCE_FILE],
      includeImpactDiagnostics: true,
      maxDiagnostics: 10,
    });

    expect(result.structuredContent?.sourceFiles).toEqual([UPLOAD_SOURCE_FILE]);
    expect(result.structuredContent?.extractedSymbols).toContainEqual(
      expect.objectContaining({
        name: "UploadPageComponent.processingProgressLabel",
        kind: "property",
        role: "behavioral",
      }),
    );
    expect(result.structuredContent?.linkedEntities).toEqual([
      expect.objectContaining({ id: "REQ-VIDEO-UPLOAD-PROGRESS" }),
      expect.objectContaining({ id: "TEST-DASH-001" }),
    ]);
    expect(result.structuredContent?.impactDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "symbol_granularity_violation",
          severity: "error",
          message: expect.stringContaining(
            "UploadPageComponent.processingProgressLabel",
          ),
        }),
        expect.objectContaining({
          id: "symbol_semantic_review_needed",
          severity: "warning",
          suggestion: expect.stringContaining("kb_query"),
        }),
      ]),
    );
    expect(result.structuredContent?.nextActions).toContainEqual(
      expect.stringContaining("kb_search"),
    );
  }, 30000);

  test("keeps narrow coverage non-blocking while still requesting semantic review", async () => {
    writeUploadSource(workspaceRoot);
    writeSymbolsManifest(
      workspaceRoot,
      `symbols:
  - id: SYM-UPLOAD-PAGE-PROGRESS-LABEL
    title: UploadPageComponent.processingProgressLabel
    sourceFile: ${UPLOAD_SOURCE_FILE}
    links:
      - REQ-VIDEO-UPLOAD-PROGRESS
    relationships:
      - type: covered_by
        target: TEST-DASH-001
    status: active
`,
    );

    const result = await handleKbCheck(prolog, {
      workspaceRoot,
      sourceFiles: [UPLOAD_SOURCE_FILE],
      includeImpactDiagnostics: true,
    });
    const impactDiagnostics = result.structuredContent?.impactDiagnostics ?? [];

    expect(
      impactDiagnostics.some(
        (diagnostic) => diagnostic.id === "symbol_granularity_violation",
      ),
    ).toBe(false);
    expect(impactDiagnostics).toContainEqual(
      expect.objectContaining({
        id: "symbol_semantic_review_needed",
        severity: "warning",
        message: expect.stringContaining(
          "UploadPageComponent.processingProgressLabel",
        ),
        suggestion: expect.stringContaining("REQ-VIDEO-UPLOAD-PROGRESS"),
      }),
    );
  }, 30000);
});
