import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";

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
): Promise<Record<string, unknown>> {
  const child = Bun.spawn(["bun", "run", kibiBin, name, "--input", "-"], {
    cwd: workspace.root,
    env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspace.root }),
    stdin: new Blob([JSON.stringify(input)]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
  return JSON.parse(stdout) as Record<string, unknown>;
}

async function frontmatterOf(workspace: ParityWorkspace, id: string) {
  const entity = await queried(workspace, id);
  const source = String(entity?.source ?? "");
  const content = readFileSync(path.resolve(workspace.root, source), "utf8");
  return loadYaml(content.split("---")[1] ?? "") as Record<string, unknown>;
}

async function run(workspace: ParityWorkspace, args: string[]): Promise<void> {
  const child = Bun.spawn(args, {
    cwd: workspace.root,
    env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspace.root }),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);
  expect(exitCode, stderr).toBe(0);
}

async function queried(workspace: ParityWorkspace, id: string) {
  const result = await route(workspace, "query", { id });
  const data = result.data as { entities?: Array<Record<string, unknown>> };
  return data.entities?.find((entity) => entity.id === id);
}

describe("entity origin through kb_upsert", () => {
  let workspace: ParityWorkspace;

  beforeAll(async () => {
    workspace = await createParityWorkspace();
  }, 60_000);

  afterAll(async () => {
    await workspace?.cleanup();
  });

  test("a new entity written without origin is recorded as agent-authored and round-trips", async () => {
    await route(workspace, "upsert", {
      type: "req",
      id: "REQ-ORIGIN-NEW",
      properties: { title: "Origin default", status: "open" },
    });

    const stored = (await frontmatterOf(workspace, "REQ-ORIGIN-NEW"))
      .origin as Record<string, unknown>;
    expect(stored.kind).toBe("agent");
    expect(typeof stored.recorded_at).toBe("string");
    expect(Object.keys(stored).sort()).toEqual(["kind", "recorded_at"]);
    expect((await queried(workspace, "REQ-ORIGIN-NEW"))?.origin).toEqual(
      stored,
    );
  }, 60_000);

  test("an update without origin never overwrites the stored origin", async () => {
    const before = (await frontmatterOf(workspace, "REQ-ORIGIN-NEW")).origin;

    await route(workspace, "upsert", {
      type: "req",
      id: "REQ-ORIGIN-NEW",
      properties: { title: "Origin default, retitled", status: "open" },
    });

    const after = await frontmatterOf(workspace, "REQ-ORIGIN-NEW");
    expect(after.title).toBe("Origin default, retitled");
    expect(after.origin).toEqual(before);
  }, 60_000);

  test("an existing entity without origin stays without one when updated", async () => {
    writeFileSync(
      path.join(workspace.root, ".kb/requirements/REQ-ORIGIN-LEGACY.md"),
      "---\nid: REQ-ORIGIN-LEGACY\ntitle: Written before schema 6\ntype: req\nstatus: open\n---\n\nLegacy requirement.\n",
      "utf8",
    );
    await run(workspace, ["git", "add", "--all"]);
    await run(workspace, ["bun", "run", kibiBin, "sync"]);

    await route(workspace, "upsert", {
      type: "req",
      id: "REQ-ORIGIN-LEGACY",
      properties: { title: "Retitled by an agent", status: "open" },
    });

    const entity = await queried(workspace, "REQ-ORIGIN-LEGACY");
    expect(entity?.title).toBe("Retitled by an agent");
    expect(entity?.origin).toBeUndefined();
    expect(
      (await frontmatterOf(workspace, "REQ-ORIGIN-LEGACY")).origin,
    ).toBeUndefined();
  }, 60_000);

  test("an explicit origin is stored as given, with the write time filled in", async () => {
    await route(workspace, "upsert", {
      type: "req",
      id: "REQ-ORIGIN-HUMAN",
      properties: {
        title: "Origin supplied",
        status: "open",
        origin: { kind: "human", ref: "ticket-42", approved_by: "dana" },
      },
    });

    const entity = await queried(workspace, "REQ-ORIGIN-HUMAN");
    expect(entity?.origin).toMatchObject({
      kind: "human",
      ref: "ticket-42",
      approved_by: "dana",
    });
    expect(typeof (entity?.origin as Record<string, unknown>).recorded_at).toBe(
      "string",
    );
  }, 60_000);

  test("an unknown origin kind is rejected before anything is written", async () => {
    const child = Bun.spawn(["bun", "run", kibiBin, "upsert", "--input", "-"], {
      cwd: workspace.root,
      env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspace.root }),
      stdin: new Blob([
        JSON.stringify({
          type: "req",
          id: "REQ-ORIGIN-BAD",
          properties: {
            title: "Bad origin",
            status: "open",
            origin: { kind: "robot" },
          },
        }),
      ]),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
    ]);
    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("origin");
    expect(await queried(workspace, "REQ-ORIGIN-BAD")).toBeUndefined();
  }, 60_000);
});
