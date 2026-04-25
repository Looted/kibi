/**
 * Tests for BriefDocumentProvider - renders brief JSON files as Markdown virtual documents.
 * Tests the pure logic without vscode dependencies.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";
import type { BriefModel } from "../src/briefs";

// Mock vscode before importing the provider
resetVscodeMock({});
mock.module("vscode", () => getVscodeMockModule());

// Dynamic import after mock is set up
const { BriefDocumentProvider } = await import("../src/briefDocumentProvider");

/**
 * Creates a minimal valid brief JSON object.
 */
function createBrief(overrides: Partial<{
  briefId: string;
  branch: string;
  unread: boolean;
  type: "success" | "warning";
  sessionId: string;
  summary: string;
  counts: Partial<{
    requirementsAdded: number;
    relationshipsAdded: number;
    entitiesDeleted: number;
  }>;
  validation: Partial<{
    violations: Array<{
      rule: string;
      entityId: string;
      description: string;
      suggestion?: string;
    }>;
    count: number;
  }>;
  briefing: Partial<{
    citations: Array<{
      id: string;
      title?: string;
      source?: string;
    }>;
  }>;
  contentHash: string;
}> = {}): BriefModel {
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
  };
}

let tmpDir: string;
let provider: BriefDocumentProvider;

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
    } as any;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toBe("# No Kibi Briefs\n\nNo briefs directory found.");
  });

  test("returns 'brief not found' when directory exists but no matching brief", () => {
    // Create empty briefs directory
    fs.mkdirSync(path.join(tmpDir, ".kb", "briefs"), { recursive: true });

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/nonexistent-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("# Brief Not Found");
    expect(result).toContain("nonexistent-brief");
  });

  test("returns Markdown for valid brief", () => {
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
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/test-brief-456.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);

    // Should contain Markdown sections
    expect(result).toContain("# Kibi Brief:");
    expect(result).toContain("## Summary");
    expect(result).toContain("This is a test brief");
    expect(result).toContain("## Changes");
    expect(result).toContain("## Validation");
    expect(result).toContain("Brief ID: test-brief-456");
    expect(result).toContain("Content Hash: abc123");
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
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/warning-brief.md",
    } as any;

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
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/success-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("✅ Success");
    expect(result).not.toContain("⚠️ Warning");
  });

  test("Markdown contains expected sections (Summary, Changes, Validation)", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "section-test-brief",
      counts: {
        requirementsAdded: 5,
        relationshipsAdded: 10,
        entitiesDeleted: 2,
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "section-test-brief_brief.json"),
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/section-test-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Summary");
    expect(result).toContain("## Changes");
    expect(result).toContain("Requirements added: 5");
    expect(result).toContain("Relationships added: 10");
    expect(result).toContain("Entities deleted: 2");
    expect(result).toContain("## Validation");
    expect(result).toContain("✅ No validation issues found.");
  });

  test("Markdown includes Citations section when citations exist", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "citations-brief",
      briefing: {
        citations: [
          { id: "REQ-001", title: "Authentication requirement", source: "docs/reqs.md" },
          { id: "ADR-005", source: "docs/adr.md" },
        ],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "citations-brief_brief.json"),
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/citations-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Citations");
    expect(result).toContain("**REQ-001**: Authentication requirement (docs/reqs.md)");
    expect(result).toContain("**ADR-005** (docs/adr.md)");
  });

  test("Markdown includes Validation Issues section when violations exist", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const brief = createBrief({
      briefId: "violations-brief",
      validation: {
        violations: [
          {
            rule: "no-dangling-refs",
            entityId: "REQ-999",
            description: "Missing reference target",
            suggestion: "Add the missing target entity",
          },
        ],
        count: 1,
        diagnostics: [],
      },
    });

    fs.writeFileSync(
      path.join(briefsDir, "violations-brief_brief.json"),
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/violations-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("## Validation Issues");
    expect(result).toContain("**Total violations:** 1");
    expect(result).toContain("### no-dangling-refs");
    expect(result).toContain("**Entity:** REQ-999");
    expect(result).toContain("**Description:** Missing reference target");
    expect(result).toContain("**Suggestion:** Add the missing target entity");
  });

  test("includes metadata (Branch, Created, Session, Unread)", () => {
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
      JSON.stringify(brief)
    );

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/feature/auth/metadata-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);

    expect(result).toContain("**Branch:** feature/auth");
    expect(result).toContain("**Session:** session-xyz-789");
    expect(result).toContain("**Unread:** Yes");
  });

  test("ignores files that are not _brief.json", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Create brief file
    const brief = createBrief({ briefId: "real-brief" });
    fs.writeFileSync(
      path.join(briefsDir, "real-brief_brief.json"),
      JSON.stringify(brief)
    );

    // Create non-brief file
    fs.writeFileSync(path.join(briefsDir, "other-file.txt"), "some content");

    const uri = {
      authority: encodeURIComponent(tmpDir),
      path: "/develop/real-brief.md",
    } as any;

    const result = provider.provideTextDocumentContent(uri);
    expect(result).toContain("## Summary");
  });
});

describe("BriefDocumentProvider.scheme", () => {
  test("scheme is kibi-brief", () => {
    expect(BriefDocumentProvider.scheme).toBe("kibi-brief");
  });
});
