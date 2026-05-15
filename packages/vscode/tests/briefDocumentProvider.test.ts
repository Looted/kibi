/**
 * Tests for BriefDocumentProvider - renders brief JSON files as Markdown virtual documents.
 * Tests the pure logic without vscode dependencies.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
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
  mock.restore();
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
        missingEvidence: [{ statement: "Evidence for TEST-123 is pending", citationIds: [] }],
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
    const disposable = provider.onDidChange((uri: any) => {
      received.push(uri.toString());
    });

    // Fire event through the private emitter
    const emitter = (provider as any)._onDidChange;
    emitter.fire({ toString: () => "kibi-brief://test-uri" });

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
          { statement: "Cache invalidation may cause latency spike", citationIds: ["REQ-002"] },
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
    expect(result).toContain("- Cache invalidation may cause latency spike (REQ-002)");
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
    expect(result).toContain("- no-dangling-refs on REQ-999: Requirement has no linked test");
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
    expect(result).toContain("- missing-evidence on SYM-001: Symbol has no requirement");
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
    expect(result).toContain("This update refines how the project knowledge should be interpreted");
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
    expect(result).toContain("This brief captures the latest project knowledge state");
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
