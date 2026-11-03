import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { signoffCommand } from "../../src/commands/signoff.js";
import { coverageSpec } from "../../src/public/operations/specs/reporting.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import type { SignoffSummary } from "../../src/signoff/model.js";
import {
  createGitWorkspace,
  git,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

const now = () => new Date("2026-10-22T09:00:00.000Z");

function workspace(): string {
  const root = createGitWorkspace("main");
  roots.push(root);
  for (const id of ["REQ-A", "REQ-B"]) {
    const file = path.join(root, ".kb", "requirements", `${id}.md`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(
      file,
      `---\nid: ${id}\ntitle: ${id} title\nstatus: open\npriority: must\n---\n${id} statement.\n`,
    );
  }
  git(root, "add -A");
  git(root, "commit --no-verify -qm reqs");
  return root;
}

function fakeRuntime(): unknown[] {
  const closed: unknown[] = [];
  spyOn(cliRuntime, "createCliRuntime").mockImplementation(
    () =>
      ({
        open: async () => ({}),
        close: async (_context: unknown, outcome: unknown) => {
          closed.push(outcome);
        },
      }) as never,
  );
  return closed;
}

const affected = async () =>
  new Map([
    ["REQ-A", ["symA"]],
    ["REQ-B", ["symB"]],
  ]);

describe("signoffCommand default proof loading", () => {
  test("reads proof state per requirement from the coverage report", async () => {
    const root = workspace();
    const closed = fakeRuntime();
    spyOn(coverageSpec, "execute").mockResolvedValue({
      content: [],
      structuredContent: {
        rows: [
          { id: 7 },
          {
            id: "REQ-A",
            proofStatus: "tested",
            testCount: 2,
            evidenceLevel: "proved",
            evidenceFloor: { required: "tested", status: "met" },
            certificateRejections: [{ test: "TEST-A", reason: "stale" }],
            proofStages: {
              contradictions: {
                conflicts: [
                  { status: "contradiction", reason: "Clashes with REQ-B." },
                  { status: "contradiction" },
                  { status: "consistent" },
                ],
              },
            },
          },
          {
            id: "REQ-B",
            evidenceFloor: {
              required: "proved",
              source: "priority",
              status: "below",
            },
          },
          {
            id: "REQ-C",
            evidenceFloor: { required: "unverified", status: "met" },
          },
        ],
      },
    } as never);
    const view = (await signoffCommand(
      { format: "json" },
      { cwd: () => root, now, write: () => undefined, loadAffected: affected },
    )) as SignoffSummary;
    expect(closed).toStrictEqual([{ status: "success", result: 4 }]);
    const proofs = Object.fromEntries(
      view.requirements.map((row) => [row.id, row.proof]),
    );
    expect(proofs["REQ-A"]).toMatchObject({
      status: "tested",
      testCount: 2,
      evidenceLevel: "proved",
      evidenceFloor: { required: "tested", source: "explicit", status: "met" },
      certificateRejections: ["TEST-A: certificate rejected, stale"],
      contradictions: [
        "Clashes with REQ-B.",
        "Two current requirements encode incompatible claims.",
      ],
    });
    expect(proofs["REQ-B"]).toMatchObject({
      status: "missing",
      testCount: 0,
      evidenceFloor: {
        required: "proved",
        source: "priority",
        status: "below",
      },
      contradictions: [],
    });
    expect(proofs["REQ-B"]).not.toHaveProperty("evidenceLevel");
  });

  test("treats a report without rows as no proof state", async () => {
    const root = workspace();
    fakeRuntime();
    spyOn(coverageSpec, "execute").mockResolvedValue({
      content: [],
      structuredContent: undefined,
    } as never);
    const view = (await signoffCommand(
      { format: "json" },
      { cwd: () => root, now, write: () => undefined, loadAffected: affected },
    )) as SignoffSummary;
    expect(view.requirements.every((row) => row.proof === undefined)).toBe(
      true,
    );
  });

  test("closes the runtime with the error when coverage fails", async () => {
    const root = workspace();
    const closed = fakeRuntime();
    const failure = new Error("coverage exploded");
    spyOn(coverageSpec, "execute").mockRejectedValue(failure);
    const view = (await signoffCommand(
      { format: "json" },
      { cwd: () => root, now, write: () => undefined, loadAffected: affected },
    )) as SignoffSummary;
    expect(closed).toStrictEqual([{ status: "error", error: failure }]);
    expect(view.notes).toContain(
      "Proof state is unavailable: coverage exploded",
    );
  });
});

describe("signoffCommand page output", () => {
  test("removes the temporary file when the page cannot be published", async () => {
    const root = workspace();
    const target = path.join(root, "out");
    mkdirSync(path.join(target, "occupied"), { recursive: true });
    await expect(
      signoffCommand(
        { format: "html", output: "out", proof: false },
        {
          cwd: () => root,
          now,
          write: () => undefined,
          loadAffected: async () => new Map(),
        },
      ),
    ).rejects.toThrow();
    expect(
      readdirSync(root).filter((name) => name.endsWith(".tmp")),
    ).toStrictEqual([]);
  });
});
