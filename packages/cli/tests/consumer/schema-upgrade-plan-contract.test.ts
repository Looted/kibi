// implements REQ-agent-guided-migration-orchestration, REQ-cli-schema-migration
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * The status plan's schema upgrade runs `kibi migrate --yes`, which also
 * rewrites authored sources (legacy-link marks in the symbols manifest) and
 * .gitignore. The plan must declare each of those writes, and the apply
 * result must say what the run changed.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type PlanAction = {
  id: string;
  code: string;
  state: string;
  safety: string;
  affectedFiles: string[];
  dependsOn: string[];
};
type MigrationPlan = Json & { planHash: string; actions: PlanAction[] };
type ApplyResult = {
  status: string;
  data: {
    outcome: string;
    actionResults: Array<{ actionId: string; outcome: string; detail: string }>;
  } | null;
  error?: { message: string };
};

// A class whose methods are the behavioral symbols: a link on the class is
// coarse for the staged granularity gate.
const GREETER = `export class Greeter {
  greet(name: string): string {
    return \`Hello \${name}\`;
  }
  wave(): string {
    return "wave";
  }
}
`;

const SYMBOLS = `symbols:
  - id: SYM-greeter
    title: Greeter
    sourceFile: src/greeter.ts
    status: active
    relationships:
      - type: implements
        target: REQ-greet
`;

function statusPlan(ws: ConsumerWorkspace): MigrationPlan {
  return (ws.json(["status"], {}) as { data: { migrationPlan: MigrationPlan } })
    .data.migrationPlan;
}

function schema8Workspace(): ConsumerWorkspace {
  const ws = createConsumerWorkspace("kibi-schema-upgrade-contract-");
  ws.write("src/greeter.ts", GREETER);
  ws.write(
    ".kb/requirements/REQ-greet.md",
    doc(
      "id: REQ-greet\ntitle: Greet\nstatus: open",
      "The greeter must greet.\n",
    ),
  );
  ws.write(".kb/symbols.yaml", SYMBOLS);
  ws.sync();
  const manifest = JSON.parse(ws.read(".kb/manifest.json")) as Json;
  ws.write(
    ".kb/manifest.json",
    `${JSON.stringify({ ...manifest, schemaVersion: 8 }, null, 2)}\n`,
  );
  // Without the canonical derived entries, the migrate run adds them.
  ws.write(".gitignore", "");
  ws.git("add", "--all");
  ws.git("commit", "-qm", "schema 8 knowledge base");
  return ws;
}

describe("the status plan's schema upgrade declares every write", () => {
  test("legacy-link marks are their own action, .gitignore is listed, and the upgrade reports its counts", () => {
    const ws = schema8Workspace();
    workspace = ws;

    const plan = statusPlan(ws);
    const mark = plan.actions.find(
      (action) => action.id === "symbol-legacy-link-mark",
    );
    expect(mark).toMatchObject({
      code: "symbol_legacy_link_mark",
      state: "ready",
      safety: "automatic",
      affectedFiles: [".kb/symbol-coordinates.yaml", ".kb/symbols.yaml"],
    });
    const upgrade = plan.actions.find(
      (action) => action.id === "schema-config-upgrade",
    );
    expect(upgrade?.code).toBe("schema_version_upgrade");
    expect(upgrade?.affectedFiles).toContain(".gitignore");
    expect(upgrade?.dependsOn).toContain("symbol-legacy-link-mark");

    // Approving the upgrade without the mark is refused: it would mark the
    // link too. (Its other dependencies, such as the entity-type backfill,
    // are approved so the refusal names the mark.)
    const otherDependencies = (upgrade?.dependsOn ?? []).filter(
      (id) => id !== "symbol-legacy-link-mark",
    );
    const refused = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: [...otherDependencies, "schema-config-upgrade"],
    }) as ApplyResult;
    expect(refused.status).toBe("error");
    expect(refused.error?.message).toContain(
      "requires approved dependency 'symbol-legacy-link-mark'",
    );
    expect(ws.read(".kb/symbols.yaml")).not.toContain("granularity_reason");

    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: [
        ...otherDependencies,
        "symbol-legacy-link-mark",
        "schema-config-upgrade",
      ],
    }) as ApplyResult;
    expect(applied.data?.outcome).toBe("applied");
    const details = Object.fromEntries(
      (applied.data?.actionResults ?? []).map((row) => [
        row.actionId,
        row.detail,
      ]),
    );
    expect(details["symbol-legacy-link-mark"]).toBe(
      "Applied symbol_legacy_link_mark.",
    );
    // The mark ran as its own action, so the upgrade's pass is a visible
    // no-op; the counts come from the audit record the run wrote.
    expect(details["schema-config-upgrade"]).toBe(
      "Migrated schema 8 -> 13 (audit .kb/migrations/main.json): legacy-link marks 0, origin backfill 0, superseded requirements closed 0, source paths rewritten 0, source paths removed 0, legacy statuses mapped 0; .gitignore updated.",
    );
    expect(ws.read(".kb/symbols.yaml")).toContain(
      "granularity_reason: legacy-link",
    );
    expect(ws.read(".gitignore")).toContain(".kb/branches/");
    const audit = JSON.parse(ws.read(".kb/migrations/main.json")) as Json;
    expect(audit).toMatchObject({
      status: "applied",
      fromVersion: 8,
      toVersion: 13,
      symbolGranularityLegacyLinks: 0,
      preMigrationWarning: expect.stringContaining(
        "KB schemaVersion 8 is older than the latest version 13",
      ),
    });
    expect(audit).not.toHaveProperty("warning");
  }, 240_000);
});
