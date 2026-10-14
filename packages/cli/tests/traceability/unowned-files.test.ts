// implements REQ-kb-unowned-file-candidates
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { analyzeChangedFileImpact } from "../../src/public/impact/analyzer.js";
import {
  pathTopicWords,
  rankRequirementCandidates,
} from "../../src/public/impact/unowned-files.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function write(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

const COACH_PAGE = "src/app/pages/coach-dashboard/coach-dashboard.html";

function coachWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-unowned-"));
  roots.push(root);
  write(
    root,
    ".kb/requirements/REQ-AUTO-E1EE.md",
    "---\nid: REQ-AUTO-E1EE\ntitle: The coach inbox must list the analysis requests assigned to the coach.\nstatus: open\n---\n\nBody.\n",
  );
  write(
    root,
    ".kb/requirements/REQ-coach-old.md",
    "---\nid: REQ-coach-old\ntitle: Coach dashboard shows totals\nstatus: superseded\n---\n\nBody.\n",
  );
  write(
    root,
    ".kb/requirements/REQ-login.md",
    "---\nid: REQ-login\ntitle: Users sign in with a password\nstatus: open\n---\n\nBody.\n",
  );
  write(root, COACH_PAGE, "<h3>Pending Requests</h3>\n");
  write(root, "README.md", "# App\n");
  return root;
}

describe("unowned files in a scoped kb_check", () => {
  it("path words drop layout, language and role words", () => {
    expect(pathTopicWords(COACH_PAGE)).toEqual(["coach", "dashboard"]);
    expect(pathTopicWords("src/services/BillingInvoices.service.ts")).toEqual([
      "billing",
      "invoice",
    ]);
  });

  it("ranks current requirements by the path words their titles share", () => {
    expect(
      rankRequirementCandidates(COACH_PAGE, [
        { id: "REQ-dashboard-theme", title: "The dashboard follows the theme" },
        {
          id: "REQ-AUTO-E1EE",
          title:
            "The coach inbox must list the analysis requests assigned to the coach.",
        },
        { id: "REQ-retired", title: "Coach dashboard", status: "deprecated" },
      ]).map((candidate) => candidate.id),
    ).toEqual(["REQ-AUTO-E1EE", "REQ-dashboard-theme"]);
  });

  it("names candidate requirements for a requested file no symbol links", async () => {
    const root = coachWorkspace();
    const result = await analyzeChangedFileImpact({
      workspaceRoot: root,
      sourceFiles: [COACH_PAGE, "README.md"],
      includeImpactDiagnostics: true,
    });
    const unowned = result.impactDiagnostics.filter(
      (diagnostic) => diagnostic.id === "source_file_unowned",
    );
    expect(unowned).toHaveLength(1);
    expect(unowned[0]).toMatchObject({
      severity: "info",
      blocking: false,
      files: [COACH_PAGE],
      evidence: {
        candidates: [
          {
            id: "REQ-AUTO-E1EE",
            title:
              "The coach inbox must list the analysis requests assigned to the coach.",
          },
        ],
      },
    });
    expect(unowned[0]?.message).toContain(
      "that does not mean no recorded rule covers the behavior it implements",
    );
    expect(unowned[0]?.message).toContain("REQ-AUTO-E1EE (The coach inbox");
    expect(unowned[0]?.suggestion).toContain("kb_query each candidate");
  });

  it("points at kb_search when no requirement shares the path words", async () => {
    const root = coachWorkspace();
    write(root, "src/billing/invoice.ts", "export const total = 1;\n");
    const result = await analyzeChangedFileImpact({
      workspaceRoot: root,
      sourceFiles: ["src/billing/invoice.ts"],
      includeImpactDiagnostics: true,
    });
    const unowned = result.impactDiagnostics.find(
      (diagnostic) => diagnostic.id === "source_file_unowned",
    );
    expect(unowned?.evidence).toEqual({ candidates: [] });
    expect(unowned?.suggestion).toContain(
      'sourceLocations:[{path:"src/billing/invoice.ts"}]',
    );
  });

  it("says nothing about files when none were named or diagnostics are off", async () => {
    const root = coachWorkspace();
    const off = await analyzeChangedFileImpact({
      workspaceRoot: root,
      sourceFiles: [COACH_PAGE],
      includeImpactDiagnostics: false,
    });
    expect(off.impactDiagnostics).toEqual([]);
  });
});
