/**
 * Tests for BriefDocumentProvider - renders brief JSON files as Markdown virtual documents.
 * Tests the pure logic without vscode dependencies.
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { BriefModel } from "../src/briefs";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

// Mock vscode before importing the provider
resetVscodeMock({});
mock.module("vscode", () => getVscodeMockModule());

// Dynamic import after mock is set up
const { BriefDocumentProvider } = await import("../src/briefDocumentProvider");

/**
 * Creates a minimal valid brief JSON object.
 */
function createBrief(
  overrides: {
    briefId?: string;
    branch?: string;
    unread?: boolean;
    type?: "success" | "warning";
    sessionId?: string;
    summary?: string;
    briefing?: Partial<{
      tldr: string;
      promptBlock: string;
      citations: Array<{
        id: string;
        type?: string;
        title?: string;
        source?: string;
        textRef?: string;
      }>;
      constraints?: Array<{
        statement: string;
        citationIds: string[];
      }>;
      regressionRisks?: Array<{
        statement: string;
        citationIds: string[];
      }>;
      missingEvidence?: Array<{
        statement: string;
        citationIds: string[];
      }>;
    }>;
  } = {},
): BriefModel {
  return {
    schemaVersion: "1.0",
    briefId: "brief-123",
    type: "success",
    sessionId: "session-abc",
    branch: "develop",
    createdAt: "2026-01-15T10:00:00Z",
    unread: true,
    auditCursor: {
      lastTimestamp: "2026-01-15T09:55:00Z",
      lastOperation: "sync",
      entryCount: 5,
      fileSize: 1024,
    },
    summary: "Test brief summary",
    counts: {
      requirementsAdded: 2,
      relationshipsAdded: 3,
      entitiesDeleted: 0,
    },
    validation: {
      violations: [],
      count: 0,
      diagnostics: [],
    },
    briefing: {
      tldr: "TL;DR test",
      promptBlock: "prompt block content",
      citations: [],
    },
    contentHash: "abc123",
    ...overrides,
  } as BriefModel;
}

let tmpDir: string;
let provider: InstanceType<typeof BriefDocumentProvider>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-docprovider-test-"));
  provider = new BriefDocumentProvider();
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("provideTextDocumentContent", () => {
  test("returns 'no briefs directory found' when .kb/briefs does not exist", () => {
    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/branch/brief-123.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toBe("# No Kibi Briefs\n\nNo briefs directory found.");
  });

  test("returns 'brief not found' when directory exists but no matching brief", () => {
    // Create empty briefs directory
    fs.mkdirSync(path.join(tmpDir, ".kb", "briefs"), { recursive: true });

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/nonexistent-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("# Brief Not Found");
    expect(result).toContain("nonexistent-brief");
  });

  test("renders user-facing informative brief format", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "test-brief-456",
      branch: "develop",
      summary: "This is a test brief",
      unread: true,
    });

    fs.writeFileSync(
      path.join(briefsDir, "test-brief-456_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/test-brief-456.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("# Kibi Brief:");
    expect(result).toContain("## What changed");
    expect(result).toContain("TL;DR test");
    expect(result).toContain("## Why it matters");
    expect(result).toContain("prompt block content");

    expect(result).not.toContain("**Session:**");
    expect(result).not.toContain("**Unread:**");
    expect(result).not.toContain("## Overview");
    expect(result).not.toContain("## Session Summary");
    expect(result).not.toContain("## What Changed");
    expect(result).not.toContain("## Relevant KB Context");
    expect(result).not.toContain("## Validation Status");
    expect(result).not.toContain("## Next Step");
    expect(result).not.toContain("Brief ID:");
    expect(result).not.toContain("Content Hash:");
  });

  test("shows warning emoji for warning type brief", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "warning-brief",
      type: "warning",
    });

    fs.writeFileSync(
      path.join(briefsDir, "warning-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/warning-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("⚠️ Warning");
    expect(result).not.toContain("✅ Success");
  });

  test("shows checkmark for success type brief", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "success-brief",
      type: "success",
    });

    fs.writeFileSync(
      path.join(briefsDir, "success-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/success-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("✅ Success");
    expect(result).not.toContain("⚠️ Warning");
  });

  test("includes branch and created metadata only", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "metadata-brief",
      branch: "feature/auth",
      sessionId: "session-xyz-789",
      unread: true,
    });

    fs.writeFileSync(
      path.join(briefsDir, "metadata-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/metadata-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("**Branch:** feature/auth");
    expect(result).toContain("**Created:** 2026-01-15T10:00:00Z");
    expect(result).not.toContain("**Session:**");
    expect(result).not.toContain("**Unread:**");
  });

  test("renders Project knowledge impact when context exists", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "citations-brief",
      briefing: {
        citations: [
          {
            id: "REQ-001",
            title: "Authentication requirement",
            source: "docs/reqs.md",
          },
          { id: "ADR-005", source: "docs/adr.md" },
        ],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "citations-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/citations-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Project knowledge impact");
    expect(result).toContain("### Evidence and authority updates");
    expect(result).toContain(
      "- **REQ-001**: Authentication requirement (docs/reqs.md)",
    );
    expect(result).toContain("- **ADR-005** (docs/adr.md)");
  });

  test("omits Project knowledge impact when there is no context", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "no-context-brief" });

    fs.writeFileSync(
      path.join(briefsDir, "violations-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/no-context-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).not.toContain("## Project knowledge impact");
  });

  test("renders Interpretation note as descriptive, not imperative", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "interpretation-note-brief",
      briefing: {
        citations: [],
        missingEvidence: [
          { statement: "Evidence for TEST-123 is pending", citationIds: [] },
        ],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "metadata-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/interpretation-note-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Interpretation note");
    expect(result).toContain("This brief includes unresolved evidence notes:");
    expect(result).toContain("- Evidence for TEST-123 is pending");
    expect(result).not.toContain("Review missing evidence");
  });

  test("ignores files that are not _brief.json", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Create brief file
    const brief = createBrief({ briefId: "real-brief" });
    fs.writeFileSync(
      path.join(briefsDir, "real-brief_brief.json"),
      JSON.stringify(brief),
    );

    // Create non-brief file
    fs.writeFileSync(path.join(briefsDir, "other-file.txt"), "some content");

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/real-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("## What changed");
  });

  test("ignores malformed brief JSON files when finding a matching brief", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    fs.writeFileSync(path.join(briefsDir, "broken_brief.json"), "{not-json");
    fs.writeFileSync(
      path.join(briefsDir, "real-brief_brief.json"),
      JSON.stringify(createBrief({ briefId: "real-brief" })),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/real-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("# Kibi Brief:");
    expect(result).toContain("## What changed");
  });

  test("uses prompt block for What changed when tldr and summary are absent", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "promptblock-what-changed",
      summary: "",
      briefing: {
        tldr: "",
        promptBlock: "Prompt block fallback",
        citations: [],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "promptblock-what-changed_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/promptblock-what-changed.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## What changed\nPrompt block fallback");
  });

  test("uses default What changed fallback when brief has no summary text", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "default-what-changed",
      summary: "",
      briefing: {
        tldr: "",
        promptBlock: "",
        citations: [],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "default-what-changed_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/default-what-changed.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain(
      "## What changed\nKnowledge updates were recorded in this brief.",
    );
  });

  test("uses v2 change narrative for What changed when present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief: BriefModel = {
      schemaVersion: "2.0",
      briefId: "narrative-brief",
      type: "success",
      sessionId: "session-abc",
      branch: "develop",
      createdAt: "2026-01-15T10:00:00Z",
      unread: true,
      auditCursor: {
        lastTimestamp: "2026-01-15T09:55:00Z",
        lastOperation: "sync",
        entryCount: 5,
        fileSize: 1024,
      },
      summary: "Test brief summary",
      counts: {
        entitiesAdded: 1,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 0,
      },
      changes: {
        entities: { added: [], modified: [], removed: [] },
        relationships: { changed: 0 },
      },
      validation: {
        violations: [],
        count: 0,
        diagnostics: [],
      },
      briefing: {
        tldr: "Fallback tldr",
        promptBlock: "",
        citations: [],
        changeNarrative: [
          "ADR-021 superseded ADR-009 for append-only requirement evolution.",
        ],
      },
      contentHash: "abc123",
    };

    fs.writeFileSync(
      path.join(briefsDir, "promptblock-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/narrative-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## What changed");
    expect(result).toContain(
      "ADR-021 superseded ADR-009 for append-only requirement evolution.",
    );
  });
});

describe("BriefDocumentProvider.scheme", () => {
  test("scheme is kibi-brief", () => {
    expect(BriefDocumentProvider.scheme).toBe("kibi-brief");
  });
});

describe("onDidChange", () => {
  test("registers event listener and returns disposable", () => {
    const provider = new BriefDocumentProvider();
    const listener = mock(() => {});
    const disposable = provider.onDidChange(listener);
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe("function");
    disposable.dispose();
  });
});

describe("onDidChange event firing", () => {
  test("fires event and listener receives the URI", () => {
    const provider = new BriefDocumentProvider();
    const received: string[] = [];
    const disposable = provider.onDidChange((uri: import("vscode").Uri) => {
      received.push(uri.toString());
    });

    // Fire event through the private emitter
    const emitter = (provider as unknown as { _onDidChange: { fire: (uri: import("vscode").Uri) => void } })._onDidChange;
    emitter.fire({ toString: () => "kibi-brief://test-uri" } as import("vscode").Uri);

    expect(received.length).toBe(1);
    expect(received[0]).toBe("kibi-brief://test-uri");
    disposable.dispose();
  });
});

describe("renderBriefAsMarkdown — constraints, risks, violations", () => {
  test("renders constraints section when constraints present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "constraints-brief",
      briefing: {
        citations: [{ id: "REQ-001", title: "Auth" }],
        constraints: [
          { statement: "All logins require 2FA", citationIds: ["REQ-001"] },
        ],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "constraints-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/constraints-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("### Constraints now reflected");
    expect(result).toContain("- All logins require 2FA (REQ-001)");
  });

  test("renders regression risks section when risks present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "risks-brief",
      briefing: {
        citations: [{ id: "REQ-002", title: "Perf" }],
        regressionRisks: [
          {
            statement: "Cache invalidation may cause latency spike",
            citationIds: ["REQ-002"],
          },
        ],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "risks-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/risks-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("### Regression considerations");
    expect(result).toContain(
      "- Cache invalidation may cause latency spike (REQ-002)",
    );
  });

  test("renders violations with suggestion", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "violations-brief",
    });
    brief.validation.violations.push({
      rule: "no-dangling-refs",
      entityId: "REQ-999",
      description: "Requirement has no linked test",
      suggestion: "Add a TEST entity linked to REQ-999",
    });

    fs.writeFileSync(
      path.join(briefsDir, "violations-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/violations-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("## Interpretation note");
    expect(result).toContain(
      "- no-dangling-refs on REQ-999: Requirement has no linked test",
    );
    expect(result).toContain("(Add a TEST entity linked to REQ-999)");
  });

  test("renders violation without suggestion", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "no-suggest-brief",
    });
    brief.validation.violations.push({
      rule: "missing-evidence",
      entityId: "SYM-001",
      description: "Symbol has no requirement",
    });

    fs.writeFileSync(
      path.join(briefsDir, "no-suggest-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/no-suggest-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain(
      "- missing-evidence on SYM-001: Symbol has no requirement",
    );
  });

  test("renders Why it matters with tldr-only message (no promptBlock)", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "why-tldr-only-brief",
      briefing: {
        tldr: "Some meaningful update",
        promptBlock: "",
        citations: [],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "why-tldr-only-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/why-tldr-only-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain(
      "This update refines how the project knowledge should be interpreted",
    );
  });

  test("renders Why it matters default message (no tldr, no promptBlock)", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "why-default-msg-brief",
      briefing: {
        tldr: "",
        promptBlock: "",
        citations: [],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "why-default-msg-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/why-default-msg-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain(
      "This brief captures the latest project knowledge state",
    );
  });

  test("renders What changed using summary fallback", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "summary-fallback-brief",
      summary: "Summary-level description of changes",
      briefing: {
        tldr: "",
        promptBlock: "",
        citations: [],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "summary-fallback-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/summary-fallback-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("Summary-level description of changes");
  });
});

describe("renderBriefAsMarkdown — automationReview section", () => {
  test("renders Automated Modeling Review section when automationReview is present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "automation-review-brief",
    }) as BriefModel & { structuredContent?: unknown };
    (brief as unknown as Record<string, unknown>).structuredContent = {
      automationReview: {
        generatedEntities: [
          {
            id: "REQ-100",
            type: "req",
            title: "Auth requirement",
            confidence: 0.9,
          },
          {
            id: "FACT-101",
            type: "fact",
            title: "Auth domain fact",
            confidence: 0.85,
          },
          { id: "TEST-102", type: "test", title: "Auth test", confidence: 0.8 },
        ],
        strictReadinessScore: 0.85,
        confidence: 0.9,
        migrationWarnings: [],
        contradictionRisks: ["REQ-001 may conflict with REQ-002"],
        evidenceCitationIds: ["FACT-001", "FACT-002"],
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "automation-review-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/automation-review-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Automated Modeling Review");
    expect(result).toContain("**Strict Readiness Score:** 0.85");
    expect(result).toContain("**Confidence:** 0.9");
    expect(result).toContain("**Generated Entities:** 3");
    expect(result).toContain("### Contradiction Risks");
    expect(result).toContain("- REQ-001 may conflict with REQ-002");
    expect(result).toContain("### Evidence Citations");
    expect(result).toContain("- FACT-001, FACT-002");
  });

  test("omits Automated Modeling Review section when automationReview is null", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "no-review-brief",
    }) as BriefModel & { structuredContent?: unknown };
    (brief as unknown as Record<string, unknown>).structuredContent = {
      automationReview: null,
    };

    fs.writeFileSync(
      path.join(briefsDir, "no-review-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/no-review-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).not.toContain("## Automated Modeling Review");
    expect(result).toContain("## What changed");
  });

  test("omits Automated Modeling Review section when structuredContent is absent", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "no-structured-content-brief",
    });

    fs.writeFileSync(
      path.join(briefsDir, "no-structured-content-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/no-structured-content-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).not.toContain("## Automated Modeling Review");
  });

  test("renders migration warnings when present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "migration-warn-brief",
    }) as BriefModel & { structuredContent?: unknown };
    (brief as unknown as Record<string, unknown>).structuredContent = {
      automationReview: {
        generatedEntities: [
          {
            id: "REQ-100",
            type: "req",
            title: "Auth requirement",
            confidence: 0.9,
          },
        ],
        strictReadinessScore: 0.7,
        confidence: 0.8,
        migrationWarnings: [
          "Schema version is outdated. Run `kibi migrate` to upgrade.",
          "Field 'priority' has been renamed to 'severity'.",
        ],
        contradictionRisks: [],
        evidenceCitationIds: [],
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "migration-warn-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/migration-warn-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("### Migration Warnings");
    expect(result).toContain(
      "- Schema version is outdated. Run `kibi migrate` to upgrade.",
    );
    expect(result).toContain(
      "- Field 'priority' has been renamed to 'severity'.",
    );
  });

  test("degrades gracefully with empty automationReview fields", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "graceful-brief",
    }) as BriefModel & { structuredContent?: unknown };
    (brief as unknown as Record<string, unknown>).structuredContent = {
      automationReview: {
        generatedEntities: [],
        strictReadinessScore: 0.5,
        confidence: 0.5,
        migrationWarnings: [],
        contradictionRisks: [],
        evidenceCitationIds: [],
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "graceful-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/graceful-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    // Section should render with minimal content
    expect(result).toContain("## Automated Modeling Review");
    expect(result).toContain("**Generated Entities:** 0");
    // Sub-sections for empty arrays should be omitted
    expect(result).not.toContain("### Migration Warnings");
    expect(result).not.toContain("### Contradiction Risks");
    expect(result).not.toContain("### Evidence Citations");
  });
});
describe("renderBriefAsMarkdown — automationReview section", () => {
  test("renders Automated Modeling Review section when automationReview is present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "automation-review-brief" });
    const briefWithAutomation = {
      ...brief,
      structuredContent: {
        automationReview: {
          generatedEntities: [
            {
              id: "REQ-AUTO-001",
              type: "req",
              title: "Auto requirement",
              confidence: 0.9,
            },
          ],
          strictReadinessScore: 0.85,
          confidence: 0.9,
          migrationWarnings: [
            "Schema version is outdated. Run kibi migrate to upgrade.",
          ],
          contradictionRisks: ["REQ-001 may conflict with REQ-002"],
          evidenceCitationIds: ["FACT-001", "FACT-002"],
        },
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "automation-review-brief_brief.json"),
      JSON.stringify(briefWithAutomation),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/automation-review-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Automated Modeling Review");
    expect(result).toContain("**Strict Readiness Score:** 0.85");
    expect(result).toContain("**Confidence:** 0.9");
    expect(result).toContain("**Generated Entities:** 1");
    expect(result).toContain("### Migration Warnings");
    expect(result).toContain(
      "- Schema version is outdated. Run kibi migrate to upgrade.",
    );
    expect(result).toContain("### Contradiction Risks");
    expect(result).toContain("- REQ-001 may conflict with REQ-002");
    expect(result).toContain("### Evidence Citations");
    expect(result).toContain("- FACT-001, FACT-002");
  });

  test("omits Automated Modeling Review section when automationReview is null", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "null-automation-brief" });
    const briefWithNullAutomation = {
      ...brief,
      structuredContent: {
        automationReview: null,
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "null-automation-brief_brief.json"),
      JSON.stringify(briefWithNullAutomation),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/null-automation-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).not.toContain("## Automated Modeling Review");
  });

  test("omits Automated Modeling Review section when structuredContent is missing", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "no-structured-brief" });

    fs.writeFileSync(
      path.join(briefsDir, "no-structured-brief_brief.json"),
      JSON.stringify(brief),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/no-structured-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).not.toContain("## Automated Modeling Review");
  });

  test("renders migration warnings when present", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "migration-warn-brief" });
    const briefWithWarnings = {
      ...brief,
      structuredContent: {
        automationReview: {
          generatedEntities: [],
          strictReadinessScore: 0.5,
          confidence: 0.6,
          migrationWarnings: [
            "Schema version is outdated.",
            "Missing required field: strictReadinessScore.",
          ],
          contradictionRisks: [],
          evidenceCitationIds: [],
        },
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "migration-warn-brief_brief.json"),
      JSON.stringify(briefWithWarnings),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/migration-warn-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("### Migration Warnings");
    expect(result).toContain("- Schema version is outdated.");
    expect(result).toContain("- Missing required field: strictReadinessScore.");
  });

  test("degrades gracefully with unknown automationReview shape", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "unknown-shape-brief" });
    // Simulate a future/unknown version with unexpected fields
    const briefWithUnknown = {
      ...brief,
      structuredContent: {
        automationReview: {
          version: "3.0",
          unknownField: true,
        },
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "unknown-shape-brief_brief.json"),
      JSON.stringify(briefWithUnknown),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/unknown-shape-brief.md",
    } as unknown as import("vscode").Uri;

    // Should not crash — either renders what it can or omits section
    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("# Kibi Brief:");
    expect(result).toContain("## What changed");
  });

  test("omits Migration Warnings subsection when array is empty", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({ briefId: "no-migration-warn-brief" });
    const briefWithAutomation = {
      ...brief,
      structuredContent: {
        automationReview: {
          generatedEntities: [],
          strictReadinessScore: 0.95,
          confidence: 0.98,
          migrationWarnings: [],
          contradictionRisks: ["REQ-010 may conflict with REQ-020"],
          evidenceCitationIds: ["FACT-100"],
        },
      },
    };

    fs.writeFileSync(
      path.join(briefsDir, "no-migration-warn-brief_brief.json"),
      JSON.stringify(briefWithAutomation),
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/no-migration-warn-brief.md",
    } as unknown as import("vscode").Uri;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Automated Modeling Review");
    expect(result).not.toContain("### Migration Warnings");
    expect(result).toContain("### Contradiction Risks");
    expect(result).toContain("### Evidence Citations");
  });
});

afterAll(() => {
  mock.restore();
});
