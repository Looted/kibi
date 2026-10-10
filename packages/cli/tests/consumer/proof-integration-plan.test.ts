// implements REQ-kibi-verification-evidence-contract
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * A repository whose proof-bearing test names an integration nobody has
 * configured yet. Before the fix every proof message pointed at a bootstrap
 * step that does not write `.kb/proof/integrations.json`, so an agent had to
 * hand-write the file. Now `kibi proof inspect --json` returns a hash-bound
 * plan for the detected test runner and `kibi apply-plan` writes the file.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type PlanAction = Json & { id: string; code: string };
type MigrationPlan = Json & { planHash: string; actions: PlanAction[] };
type Inspection = {
  recommendation: string;
  proposedIntegration: { id: string; producer: string; command: string[] };
  contractDefaults: { integration: string };
  integrationPlan: MigrationPlan | null;
  integrationPlanReason: string;
};

function seed(ws: ConsumerWorkspace): void {
  ws.write(
    "package.json",
    `${JSON.stringify(
      {
        name: "proof-plan-fixture",
        private: true,
        scripts: { test: 'node -e "process.exit(0)"' },
      },
      null,
      2,
    )}\n`,
  );
  ws.write(
    ".kb/requirements/REQ-export-csv.md",
    doc(
      `
id: REQ-export-csv
title: Users export their reports as CSV
type: req
status: open
links:
  - type: specified_by
    target: SCEN-export-csv
`,
      "Users export their reports as CSV.",
    ),
  );
  ws.write(
    ".kb/scenarios/SCEN-export-csv.md",
    doc(
      `
id: SCEN-export-csv
title: A user downloads a report as CSV
type: scenario
status: active
`,
      "Given a report, when the user exports it, a CSV file is downloaded.",
    ),
  );
  ws.write(
    ".kb/tests/TEST-export-csv.md",
    doc(
      `
id: TEST-export-csv
title: Exporting a report downloads a CSV file
type: test
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: unit
  required_proofs:
    - symbol_id: SYM-export-csv
      target: default
  success_policy: all_required_first_attempt
links:
  - type: validates
    target: SCEN-export-csv
`,
      "Exporting a report downloads a CSV file.",
    ),
  );
  ws.git("add", "-A");
  ws.git("commit", "-q", "-m", "proof plan fixture");
  ws.sync();
}

function inspect(ws: ConsumerWorkspace): Inspection {
  return JSON.parse(ws.text(["proof", "inspect", "--json"])) as Inspection;
}

function applyPlan(ws: ConsumerWorkspace, plan: MigrationPlan) {
  return ws.kibi(["apply-plan"], {
    input: {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: plan.actions.map((action) => action.id),
    },
  });
}

describe("proof integration configured through a reviewed plan", () => {
  test("proof inspect plans the package.json test script, apply-plan writes the file, and kibi prove then runs it", () => {
    const ws = createConsumerWorkspace("kibi-proof-integration-plan-");
    workspace = ws;
    seed(ws);

    const before = ws.kibi(["prove", "--all"]);
    expect(before.status).not.toBe(0);
    expect(`${before.stdout}${before.stderr}`).toContain(
      "kibi proof inspect --json",
    );
    expect(`${before.stdout}${before.stderr}`).not.toContain("bootstrap");

    const inspection = inspect(ws);
    expect(inspection.proposedIntegration).toMatchObject({
      id: "unit",
      producer: "command",
      command: ["npm", "test"],
    });
    expect(inspection.contractDefaults.integration).toBe("unit");
    const plan = inspection.integrationPlan;
    expect(plan?.actions.map((action) => action.code)).toEqual([
      "proof_integration_configure",
    ]);
    if (plan === null) return;

    const applied = applyPlan(ws, plan);
    expect({ status: applied.status, stderr: applied.stderr }).toMatchObject({
      status: 0,
    });
    const written = JSON.parse(ws.read(".kb/proof/integrations.json")) as {
      version: string;
      integrations: Array<{ id: string; command: string[] }>;
    };
    expect(written).toEqual({
      version: "kibi.proof-integration.v1",
      integrations: [
        expect.objectContaining({ id: "unit", command: ["npm", "test"] }),
      ],
    });

    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "configure proof integration");
    ws.sync();
    const proved = ws.kibi(["prove", "--all"]);
    expect({ status: proved.status, stderr: proved.stderr }).toMatchObject({
      status: 0,
    });
    const summary = JSON.parse(
      proved.stdout.trim().split("\n").at(-1) ?? "{}",
    ) as { proved: number; failed: number };
    expect(summary).toMatchObject({ proved: 1, failed: 0 });

    // The same plan only creates the file; it is refused once it exists,
    // and a fresh inspection offers no create plan.
    const again = applyPlan(ws, plan);
    expect(`${again.stdout}${again.stderr}`).toContain(
      "already exists and this plan only creates it",
    );
    expect(inspect(ws).integrationPlan).toBeNull();
  });
});
