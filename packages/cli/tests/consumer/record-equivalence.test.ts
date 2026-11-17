import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { changedCheckContent } from "../../src/public/operations/changed-check.js";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * kb_record is kb_upsert of the payload it builds followed by kb_check
 * changed:true for the same files. Two identical workspaces take the same
 * inputs: one through `kibi record`, the other through `kibi upsert` of the
 * payload the first returned and then the commit gate over the same files.
 * The written result, the verdict, the KB documents (relationships
 * included) and the queried entities must be the same.
 */

const SOURCE: Record<string, string> = {
  "src/quota.ts": `export function capCalls(calls: string[]): string[] {
  return calls.slice(0, 20);
}

export function pageSize(): number {
  return 20;
}
`,
  "src/page.ts": `export function render(rows: string[]): string {
  return rows.join("\\n");
}
`,
};

const TEST_ENTITY = doc(
  "id: TEST-quota-cap\ntitle: Quota page call cap\ntype: test\nstatus: active\nverification_scope: end_to_end",
  "Loads a quota page for a client with sixty calls and counts the rows.",
);

let recorded: ConsumerWorkspace;
let upserted: ConsumerWorkspace;

function seed(prefix: string): ConsumerWorkspace {
  const workspace = createConsumerWorkspace(prefix);
  for (const [file, content] of Object.entries(SOURCE))
    workspace.write(file, content);
  workspace.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
  workspace.write(".kb/tests/TEST-quota-cap.md", TEST_ENTITY);
  workspace.git("add", "src");
  workspace.sync();
  return workspace;
}

beforeAll(() => {
  recorded = seed("kibi-record-equal-a-");
  upserted = seed("kibi-record-equal-b-");
}, 300_000);

afterAll(() => {
  recorded?.cleanup();
  upserted?.cleanup();
});

/**
 * Times (and the file hashes that cover them), durations and workspace
 * paths are the only things that may differ.
 */
function normalized(value: unknown, workspace: ConsumerWorkspace): unknown {
  return JSON.parse(
    JSON.stringify(value)
      .replaceAll(workspace.root, "<root>")
      .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/g, "<time>")
      .replace(/"(durationMs|elapsedMs|ms)":\d+/g, '"$1":0')
      // A file's hash, and the Git tree of the files, cover recorded_at.
      .replace(/"(afterHash|beforeHash)":"[0-9a-f]{64}"/g, '"$1":"<hash>"')
      .replace(/"headTree":"[0-9a-f]{40}"/g, '"headTree":"<tree>"'),
  );
}

/** Every authored KB document, by path, as text. */
function documents(workspace: ConsumerWorkspace): Record<string, string> {
  const kb = path.join(workspace.root, ".kb");
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const relative = path.relative(kb, full);
      if (statSync(full).isDirectory()) {
        if (!["branches", "recovery", "schema", "cache"].includes(relative))
          walk(full);
      } else if (/\.(md|yaml)$/.test(name)) {
        out[relative] = readFileSync(full, "utf8");
      }
    }
  };
  walk(kb);
  return normalized(out, workspace) as Record<string, string>;
}

function entities(workspace: ConsumerWorkspace): unknown {
  const types = ["req", "test", "scenario", "fact", "symbol"];
  return normalized(
    types.map((type) => workspace.json(["query"], { type }).data),
    workspace,
  );
}

/** The recorded requirement as kb_query returns it, by id. */
function requirement(workspace: ConsumerWorkspace, id: string): unknown {
  return normalized(workspace.json(["query"], { id }).data, workspace);
}

type Case = Readonly<{ name: string; input: Json }>;

const CASES: readonly Case[] = [
  {
    name: "a maintainer's rule with a quote",
    input: {
      statement: "The quota page must list at most twenty client calls.",
      why: "Slow links time out on long call lists.",
      saidBy: "maintainer",
      quote: "keep the quota page to twenty calls",
      code: [{ file: "src/quota.ts", symbol: "capCalls" }],
    },
  },
  {
    name: "an agent's rule over two files",
    input: {
      statement: "A quota page must render its rows twenty at a time.",
      why: "Reason not stated",
      saidBy: "agent",
      code: [
        { file: "src/quota.ts", symbol: "pageSize" },
        { file: "src/page.ts", symbol: "render" },
      ],
    },
  },
  {
    name: "a user's rule with a test",
    input: {
      statement: "Quota pages must show the newest client calls first.",
      why: "Support reads the latest calls when a client complains.",
      saidBy: "user",
      quote: "newest calls on top please",
      code: [{ file: "src/quota.ts", symbol: "capCalls" }],
      test: "TEST-quota-cap",
    },
  },
  {
    name: "the same statement again, as a new requirement",
    input: {
      statement: "The quota page must list at most twenty client calls.",
      why: "Restated by the gateway team.",
      saidBy: "agent",
      code: [{ file: "src/page.ts", symbol: "render" }],
    },
  },
];

describe("kb_record equals kb_upsert of its payload then kb_check changed:true", () => {
  for (const { name, input } of CASES) {
    test(name, () => {
      const record = recorded.json(["record"], input) as {
        status: string;
        data: Json;
        error?: unknown;
      };
      expect(record.status, JSON.stringify(record.error)).toBe("success");
      const data = record.data;
      const id = data.id as string;

      const upsert = upserted.json(["upsert"], data.upsert as Json) as {
        status: string;
        data: Json;
      };
      expect(upsert.status).toBe("success");
      const files = [
        ...new Set((input.code as Array<{ file: string }>).map((c) => c.file)),
      ];
      const gate = upserted.kibi([
        "check",
        "--changed",
        ...files,
        "--format",
        "json",
      ]);
      const verdict = changedCheckContent({
        exitCode: gate.status ?? 1,
        stdout: gate.stdout,
      });

      expect(normalized(data.written, recorded)).toEqual(
        normalized(upsert.data, upserted),
      );
      expect(normalized(data.verdict, recorded)).toEqual(
        normalized(verdict, upserted),
      );
      expect(data.commitAllowed).toBe(verdict.commitAllowed);
      expect(data.nextActions).toEqual(
        (upsert.data.nextActions as unknown[] | undefined) ?? [],
      );
      expect(documents(recorded)).toEqual(documents(upserted));
      expect(requirement(recorded, id)).toEqual(requirement(upserted, id));
      expect(entities(recorded)).toEqual(entities(upserted));
    }, 300_000);
  }

  test("the second write of a statement takes the next free id", () => {
    const ids = (
      (recorded.json(["query"], { type: "req" }).data as Json)
        .entities as Json[]
    ).map((entity) => entity.id);
    expect(ids).toContain("REQ-quota-page-list-most-twenty-client");
    expect(ids).toContain("REQ-quota-page-list-most-twenty-client-2");
  });

  test("a firm rule without a quote is refused the same way by both", () => {
    const input = {
      statement: "Quota pages must never list archived clients.",
      why: "Archived clients confuse support.",
      saidBy: "user",
      code: [{ file: "src/quota.ts", symbol: "capCalls" }],
    };
    const preview = recorded.json(["record"], { ...input, dryRun: true });
    const payload = (preview.data as Json).upsert as Json;
    const record = recorded.json(["record"], input);
    const upsert = upserted.json(["upsert"], payload);
    expect(record.status).toBe("error");
    expect(normalized(record.error, recorded)).toEqual(
      normalized(upsert.error, upserted),
    );
    expect(documents(recorded)).toEqual(documents(upserted));
  }, 300_000);
});
