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

describe("an upsert that omits properties keeps them in the store", () => {
  let workspace: ParityWorkspace;

  beforeAll(async () => {
    workspace = await createParityWorkspace();
  }, 60_000);

  afterAll(async () => {
    await workspace.cleanup();
  });

  test("a relationship-only update keeps required_evidence and other stored fields", async () => {
    const created = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-KEEP-FLOOR",
      properties: {
        title: "Quotes carry their currency",
        status: "open",
        required_evidence: "asserted",
        priority: "must",
        owner: "pricing",
        tags: ["pricing"],
      },
    });
    expect(created.exitCode, created.stdout).toBe(0);
    const other = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-KEEP-OTHER",
      properties: { title: "Quotes are rounded once", status: "open" },
    });
    expect(other.exitCode, other.stdout).toBe(0);

    const linked = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-KEEP-FLOOR",
      properties: { title: "Quotes carry their currency", status: "open" },
      relationships: [
        { type: "relates_to", from: "REQ-KEEP-FLOOR", to: "REQ-KEEP-OTHER" },
      ],
    });
    expect(linked.exitCode, linked.stdout).toBe(0);

    expect(await queried(workspace, "REQ-KEEP-FLOOR")).toMatchObject({
      required_evidence: "asserted",
      priority: "must",
      owner: "pricing",
      tags: ["pricing"],
    });
  }, 120_000);
});
