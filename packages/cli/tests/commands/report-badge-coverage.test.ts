// implements REQ-kibi-html-health-report

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { openReport, reportCommand } from "../../src/commands/report.js";
import { KIBI_BRAND } from "../../src/report/brand.js";

function coverage(total: number, tested: number) {
  return {
    branch: "develop",
    requirements: {
      summary: { total, proofNotApplicable: 0, proofTested: tested },
      meta: { branch: "develop", dirty: false, proofSnapshotDirty: false },
      rows: Array.from({ length: total }, (_, index) => ({
        id: `REQ-${index + 1}`,
        title: "Row",
        proofStatus: index < tested ? "tested" : "missing",
        proofGaps: [] as string[],
      })),
    },
    symbols: { summary: { total: 0, uncovered: 0, mixedRole: 0 }, rows: [] },
  };
}

describe("report badge bands and openReport", () => {
  let root: string;
  let logSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-report-bands-"));
    logSpy = spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test("renders no-requirements, 95%, and 75% badge bands", async () => {
    await reportCommand(
      { output: "empty" },
      { cwd: () => root, loadCoverage: async () => coverage(0, 0) },
    );
    expect(
      readFileSync(path.join(root, "empty", "badge.svg"), "utf8"),
    ).toContain("no requirements");

    await reportCommand(
      { output: "high.htm" },
      { cwd: () => root, loadCoverage: async () => coverage(20, 19) },
    );
    expect(readFileSync(path.join(root, "high.badge.svg"), "utf8")).toContain(
      "95% tested",
    );

    await reportCommand(
      { output: "mid" },
      { cwd: () => root, loadCoverage: async () => coverage(4, 3) },
    );
    expect(readFileSync(path.join(root, "mid", "badge.svg"), "utf8")).toContain(
      "75% tested",
    );
  });

  // implements REQ-kibi-evidence-floors
  test("a requirement below its evidence floor turns the badge red", async () => {
    const below = coverage(20, 20);
    const rows = below.requirements.rows.map((row, index) =>
      index === 0
        ? {
            ...row,
            evidenceFloor: {
              required: "proved",
              source: "explicit",
              status: "below",
            },
          }
        : row,
    );
    await reportCommand(
      { output: "below" },
      {
        cwd: () => root,
        loadCoverage: async () => ({
          ...below,
          requirements: { ...below.requirements, rows },
        }),
      },
    );
    const badge = readFileSync(path.join(root, "below", "badge.svg"), "utf8");
    expect(badge).toContain("100% tested");
    expect(badge).toContain(KIBI_BRAND.danger);
    await reportCommand(
      { output: "met" },
      { cwd: () => root, loadCoverage: async () => coverage(20, 20) },
    );
    expect(
      readFileSync(path.join(root, "met", "badge.svg"), "utf8"),
    ).not.toContain(KIBI_BRAND.danger);
  });

  // implements REQ-kibi-kb-certificates
  test("--certificates publishes the KB certificate bundle next to the page", async () => {
    const bundle = path.join(root, "certs.json");
    writeFileSync(
      bundle,
      JSON.stringify({
        version: "kibi.certificates.v1",
        certificates: [{ kind: "property_model" }, { kind: "property_model" }],
      }),
    );
    await reportCommand(
      { output: "site", certificates: "certs.json" },
      { cwd: () => root, loadCoverage: async () => coverage(2, 2) },
    );
    expect(
      JSON.parse(
        readFileSync(path.join(root, "site", "kb-certificates.json"), "utf8"),
      ).certificates,
    ).toHaveLength(2);
    expect(
      readFileSync(path.join(root, "site", "index.html"), "utf8"),
    ).toContain("KB consistency: 2 certificates (2 property model)");
    await reportCommand(
      { output: "page.html", certificates: "certs.json" },
      { cwd: () => root, loadCoverage: async () => coverage(2, 2) },
    );
    expect(existsSync(path.join(root, "page.kb-certificates.json"))).toBe(true);

    writeFileSync(
      path.join(root, "bad.json"),
      JSON.stringify({ version: "x" }),
    );
    await expect(
      reportCommand(
        { output: "bad", certificates: "bad.json" },
        { cwd: () => root, loadCoverage: async () => coverage(2, 2) },
      ),
    ).rejects.toThrow("is not a kibi.certificates.v1 bundle");
    writeFileSync(path.join(root, "garbage.json"), "{");
    await expect(
      reportCommand(
        { output: "bad", certificates: "garbage.json" },
        { cwd: () => root, loadCoverage: async () => coverage(2, 2) },
      ),
    ).rejects.toThrow("is not JSON");
  });

  test("openReport spawns the platform opener and rejects spawn errors", async () => {
    const childProcess = await import("node:child_process");
    const spawnSpy = spyOn(childProcess, "spawn").mockImplementation((() => {
      const child = new EventEmitter() as EventEmitter & {
        unref: () => void;
      };
      child.unref = () => undefined;
      queueMicrotask(() => child.emit("spawn"));
      return child as never;
    }) as typeof childProcess.spawn);
    await openReport(path.join(root, "index.html"));
    expect(spawnSpy).toHaveBeenCalled();
    spawnSpy.mockImplementation((() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("error", new Error("no opener")));
      return child as never;
    }) as typeof childProcess.spawn);
    await expect(openReport(path.join(root, "index.html"))).rejects.toThrow(
      /no opener/,
    );
    spawnSpy.mockRestore();
  });
});
