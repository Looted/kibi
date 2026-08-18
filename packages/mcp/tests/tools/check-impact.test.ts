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
import type { Violation } from "kibi-cli/public/check-types";
import type { QualityDiagnostic } from "kibi-cli/public/impact-diagnostics";
import {
  buildStructuredContent,
  formatQualityDiagnosticsText,
} from "../../src/tools/check-format.js";
import { handleKbCheck } from "../../src/tools/check.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

const UPLOAD_SOURCE_FILE = "src/app/pages/upload/upload-page.component.ts";
const MULTI_SOURCE_FILE = "src/multi.ts";

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
  const absolutePath = path.join(workspaceRoot, ".kb", "symbols.yaml");
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

function writeMultiRequirementSource(workspaceRoot: string): void {
  const absolutePath = path.join(workspaceRoot, MULTI_SOURCE_FILE);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(
    absolutePath,
    ["export function multiAction() {", "  return 'changed';", "}", ""].join(
      "\n",
    ),
  );
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

  test("keeps advisory quality diagnostics separate from empty violations", () => {
    const diagnostic: QualityDiagnostic = {
      id: "broad_requirement_review",
      severity: "review",
      blocking: false,
      category: "requirement",
      entityId: "REQ-AUDIT-001",
      message: "Requirement spans multiple user outcomes.",
      suggestion: "Split into focused requirements before adding traceability.",
      evidence: { linkedScenarios: 0 },
    };

    const structuredContent = buildStructuredContent({
      violations: [],
      diagnostics: [],
      qualityDiagnostics: [diagnostic],
      impactResult: undefined,
    });

    expect(structuredContent.violations).toEqual([]);
    expect(structuredContent.count).toBe(0);
    expect(structuredContent.qualityDiagnostics).toEqual([diagnostic]);
  });

  test("does not conflate hard violations with quality diagnostics", () => {
    const violation: Violation = {
      rule: "required-fields",
      entityId: "REQ-HARD-001",
      description: "Requirement is missing a title.",
      source: ".kb/requirements/REQ-HARD-001.md",
    };
    const diagnostic: QualityDiagnostic = {
      id: "coverage_depth_review",
      severity: "info",
      blocking: false,
      category: "coverage",
      entityId: "REQ-HARD-001",
      message: "Requirement has unit-only coverage.",
      suggestion: "Consider adding an end-to-end scenario if user-visible.",
    };

    const structuredContent = buildStructuredContent({
      violations: [violation],
      diagnostics: [],
      qualityDiagnostics: [diagnostic],
      impactResult: undefined,
    });

    expect(structuredContent.violations).toEqual([violation]);
    expect(structuredContent.count).toBe(1);
    expect(structuredContent.qualityDiagnostics).toEqual([diagnostic]);
  });

  test("formats advisory quality diagnostics without blocking checks", () => {
    const diagnostics: readonly QualityDiagnostic[] = [
      {
        id: "broad_requirement_review",
        severity: "review",
        blocking: false,
        category: "requirement",
        files: [".kb/requirements/REQ-AUDIT-001.md"],
        docs: ["docs/modeling-cheatsheet.md"],
        message: "Requirement may be too broad for precise traceability.",
        suggestion: "Split it or add stricter fact modeling.",
      },
    ];

    const formatted = formatQualityDiagnosticsText(diagnostics);

    expect(formatted).toContain("1 quality diagnostic found");
    expect(formatted).toContain(
      "broad_requirement_review | review | requirement",
    );
    expect(formatted).toContain("Blocking: no");
    expect(formatted).toContain(
      "Suggestion: Split it or add stricter fact modeling.",
    );
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

  test("returns scoped quality diagnostics alongside impact diagnostics", async () => {
    writeMultiRequirementSource(workspaceRoot);
    writeSymbolsManifest(
      workspaceRoot,
      `symbols:
  - id: SYM-MULTI-MCP-001
    title: multiAction
    sourceFile: ${MULTI_SOURCE_FILE}
    status: active
    symbol_kind: function
    symbol_role: behavioral
    relationships:
      - type: implements
        target: REQ-MULTI-MCP-001
      - type: implements
        target: REQ-MULTI-MCP-002
      - type: implements
        target: REQ-MULTI-MCP-003
`,
    );

    const result = await handleKbCheck(prolog, {
      workspaceRoot,
      sourceFiles: [MULTI_SOURCE_FILE],
      includeImpactDiagnostics: true,
    });

    expect(result.structuredContent?.impactDiagnostics).toContainEqual(
      expect.objectContaining({ id: "symbol_semantic_review_needed" }),
    );
    expect(result.structuredContent?.qualityDiagnostics).toContainEqual(
      expect.objectContaining({
        id: "multi_requirement_symbol_review",
        entityId: "SYM-MULTI-MCP-001",
      }),
    );
    expect(result.structuredContent?.nextActions).toContainEqual(
      expect.stringContaining("kb_search"),
    );
    expect(result.structuredContent?.nextActions).toContainEqual(
      expect.stringContaining("rerun kb_check"),
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
