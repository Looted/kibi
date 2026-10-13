import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { isolatedCliSandboxEnv } from "../helpers/isolated-env.js";
import {
  type ParityWorkspace,
  createParityWorkspace,
} from "../parity/helpers.js";

const kibiBin = fileURLToPath(new URL("../../bin/kibi", import.meta.url));

async function route(
  workspace: ParityWorkspace,
  name: string,
  input: Record<string, unknown>,
): Promise<{
  exitCode: number;
  stdout: string;
  json: Record<string, unknown>;
}> {
  const child = Bun.spawn(["bun", "run", kibiBin, name, "--input", "-"], {
    cwd: workspace.root,
    env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspace.root }),
    stdin: new Blob([JSON.stringify(input)]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
  ]);
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    // Non-JSON output is asserted through stdout.
  }
  return { exitCode, stdout, json };
}

async function queried(workspace: ParityWorkspace, id: string) {
  const { json } = await route(workspace, "query", { id });
  const data = json.data as { entities?: Array<Record<string, unknown>> };
  return data.entities?.find((entity) => entity.id === id);
}

const WHY =
  "## Why this changed\nA failing end-to-end test showed the old limit dropped valid carts at the boundary, which the old decision never considered.";

describe("decision firmness through the public routes", () => {
  let workspace: ParityWorkspace;

  beforeAll(async () => {
    workspace = await createParityWorkspace();
  }, 60_000);

  afterAll(async () => {
    await workspace?.cleanup();
  });

  test("kb_upsert refuses a firm decision without a reference and writes nothing", async () => {
    const result = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-NOREF",
      properties: {
        title: "Firm without ref",
        status: "open",
        firmness: "firm",
      },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toContain("firmness: firm needs origin.ref");
    expect(await queried(workspace, "REQ-FIRM-NOREF")).toBeUndefined();
  }, 60_000);

  test("kb_query shows firm for a referenced decision and default when unset", async () => {
    const firm = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-REF",
      properties: {
        title: "Firm with ref",
        status: "open",
        firmness: "firm",
        origin: { kind: "human", ref: "ticket-7" },
      },
    });
    expect(firm.exitCode, firm.stdout).toBe(0);
    const plain = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-PLAIN",
      properties: { title: "No firmness", status: "open" },
    });
    expect(plain.exitCode, plain.stdout).toBe(0);

    expect((await queried(workspace, "REQ-FIRM-REF"))?.firmness).toBe("firm");

    // An update that omits firmness keeps it and is judged with it.
    const retitled = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-REF",
      properties: { title: "Firm with ref, retitled", status: "open" },
    });
    expect(retitled.exitCode, retitled.stdout).toBe(0);
    expect((await queried(workspace, "REQ-FIRM-REF"))?.firmness).toBe("firm");
    const dropsRef = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-REF",
      properties: {
        title: "Firm with ref, retitled",
        status: "open",
        origin: { kind: "agent" },
      },
    });
    expect(dropsRef.exitCode).not.toBe(0);
    expect(dropsRef.stdout).toContain("firmness: firm needs origin.ref");
    expect((await queried(workspace, "REQ-FIRM-REF"))?.origin).toMatchObject({
      ref: "ticket-7",
    });
    expect((await queried(workspace, "REQ-FIRM-PLAIN"))?.firmness).toBe(
      "default",
    );
  }, 60_000);

  test("kb_check blocks an unexplained supersede and a default decision replacing a firm one", async () => {
    const replacement = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-NEXT",
      properties: { title: "Replaces the firm decision", status: "open" },
      relationships: [
        { type: "supersedes", from: "REQ-FIRM-NEXT", to: "REQ-FIRM-REF" },
      ],
    });
    expect(replacement.exitCode, replacement.stdout).toBe(0);

    const check = await route(workspace, "check", {
      rules: ["decision-firm-superseded", "supersedes-reason-missing"],
    });
    const violations = (
      (check.json.data as { violations?: Array<Record<string, unknown>> })
        ?.violations ?? []
    ).map((violation) => `${violation.rule}:${violation.entityId}`);
    expect(violations).toContain("decision-firm-superseded:REQ-FIRM-NEXT");
    expect(violations).toContain("supersedes-reason-missing:REQ-FIRM-NEXT");

    const explained = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-NEXT",
      properties: {
        title: "Replaces the firm decision",
        status: "open",
        firmness: "firm",
        origin: { kind: "human", ref: "ticket-8" },
      },
      document: { body: `Replaces the firm decision.\n\n${WHY}\n` },
    });
    expect(explained.exitCode, explained.stdout).toBe(0);
    const recheck = await route(workspace, "check", {
      rules: ["decision-firm-superseded", "supersedes-reason-missing"],
    });
    const remaining = (
      (recheck.json.data as { violations?: Array<Record<string, unknown>> })
        ?.violations ?? []
    ).filter((violation) => violation.entityId === "REQ-FIRM-NEXT");
    expect(remaining).toEqual([]);
  }, 120_000);
});
