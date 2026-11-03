import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  checkCertificatesCommand,
  renderVerification,
  writeCertificates,
} from "../../src/commands/check-certificates.js";
import * as prologJson from "../../src/public/operations/prolog-json.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

type Outcome = { status: string };

function fakeRuntime(context: Record<string, unknown>): Outcome[] {
  const closed: Outcome[] = [];
  spyOn(cliRuntime, "createCliRuntime").mockImplementation(
    () =>
      ({
        open: async () => context,
        close: async (_context: unknown, outcome: Outcome) => {
          closed.push(outcome);
        },
      }) as never,
  );
  return closed;
}

function bundle(): string {
  const root = createTempDir("kibi-certificates-");
  roots.push(root);
  const file = path.join(root, "bundle.json");
  writeFileSync(file, "{}");
  return file;
}

const report = {
  version: "kibi.certificate-check.v1",
  status: "verified",
  certificates: 1,
  verified: 1,
  rejected: [],
  theorems: [],
  notCovered: [],
} as const;

describe("checkCertificatesCommand", () => {
  test("prints the JSON report and closes the engine successfully", async () => {
    const closed = fakeRuntime({ prolog: {} });
    const goals: string[] = [];
    spyOn(prologJson, "runOperationJsonQuery").mockImplementation((async (
      _prolog: unknown,
      _module: string,
      goal: string,
    ) => {
      goals.push(goal);
      return report;
    }) as never);
    const out: string[] = [];
    spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      out.push(String(chunk));
      return true;
    });
    const file = bundle();
    const result = await checkCertificatesCommand({
      certificates: file,
      json: true,
    });
    mock.restore();
    expect(result).toStrictEqual({ exitCode: 0 });
    expect(out.join("")).toBe(`${JSON.stringify(report, null, 2)}\n`);
    expect(goals).toStrictEqual([
      `certificate_check:kb_verify_certificates_file('${file}', JsonString)`,
    ]);
    expect(closed).toStrictEqual([{ status: "success", result: 0 }]);
  });

  test("prints the text report", async () => {
    fakeRuntime({ prolog: {} });
    spyOn(prologJson, "runOperationJsonQuery").mockResolvedValue(
      report as never,
    );
    const out: string[] = [];
    spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      out.push(String(chunk));
      return true;
    });
    await checkCertificatesCommand({ certificates: bundle() });
    mock.restore();
    expect(out.join("")).toBe("Kibi certificates: all 1 re-verified\n\n");
  });

  test("fails and closes with an error when the engine has no Prolog", async () => {
    const closed = fakeRuntime({});
    await expect(
      checkCertificatesCommand({ certificates: bundle() }),
    ).rejects.toThrow("check: the Kibi engine is not available");
    expect(closed).toStrictEqual([{ status: "error", error: 1 }]);
  });
});

describe("writeCertificates", () => {
  test("asks the engine to write the bundle at the resolved path", async () => {
    fakeRuntime({ prolog: {} });
    const goals: string[] = [];
    spyOn(prologJson, "runOperationJsonQuery").mockImplementation((async (
      _prolog: unknown,
      _module: string,
      goal: string,
    ) => {
      goals.push(goal);
      return { path: "/x/o'k.json", certificates: 2 };
    }) as never);
    expect(await writeCertificates("/x/o'k.json")).toStrictEqual({
      path: "/x/o'k.json",
      certificates: 2,
    });
    expect(goals).toStrictEqual([
      "certificates:kb_write_certificates('/x/o''k.json', JsonString)",
    ]);
  });
});

describe("renderVerification predicate groups", () => {
  test("uses the predicate key when a group has no args", () => {
    const text = renderVerification({
      ...report,
      theorems: [
        {
          theorem: "predicates_consistent",
          verdict: "disproved",
          groups: 1,
          models: 0,
          contradictions: [
            { namespace: "dom", name: "owns", key: ["alice", "x"] },
            { namespace: "dom", name: "bare" },
          ],
        },
      ],
    });
    expect(text).toContain("    contradiction: dom:owns(alice, x)\n");
    expect(text).toContain("    contradiction: dom:bare()\n");
  });
});
