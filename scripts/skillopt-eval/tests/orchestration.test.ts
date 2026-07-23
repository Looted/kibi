import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BudgetLedger,
  RunStore,
  estimatePriceEquivalent,
  runOfflineWorkflow,
} from "../orchestration";

describe("SkillOpt orchestration", () => {
  test("reserves before launch and retains a reservation when usage is missing", () => {
    const ledger = new BudgetLedger({ development: 8 });
    const reservation = ledger.reserve("development", 2);

    expect(reservation.status).toBe("reserved");
    expect(() => ledger.reserve("development", 7)).toThrow("budget_exhausted");
    const finalized = ledger.finalize(reservation.id, undefined);

    expect(finalized.status).toBe("retained");
    expect(ledger.snapshot().development.reserved).toBe(2);
  });

  test("estimates price-equivalent cost from the pinned model table and caps requests", () => {
    expect(
      estimatePriceEquivalent("gpt-5.5", {
        inputTokens: 1_000_000,
        cachedInputTokens: 100_000,
        outputTokens: 10_000,
      }),
    ).toBeCloseTo(1.2375, 6);
    expect(() =>
      estimatePriceEquivalent("gpt-5.5", {
        inputTokens: 1_000_001,
        cachedInputTokens: 0,
        outputTokens: 0,
      }),
    ).toThrow("request_tokens_exceed_cap");
  });

  test("rejects concurrent run locks", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-lock-"));
    try {
      const first = new RunStore(root, "run-1");
      const second = new RunStore(root, "run-1");
      await first.acquire();
      let failure: unknown;
      try {
        await second.acquire();
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe("run_already_locked");
      await first.release();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("stops after a failed skill and does not rerun terminal cells", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-run-"));
    try {
      const first = await runOfflineWorkflow({
        root,
        runId: "00000000-0000-4000-8000-000000000090",
        runLockHash: "a".repeat(64),
        failSkill: "kibi-freshness",
      });
      expect(first.phase).toBe("no-go");
      expect(first.completedSkills).toEqual(["kibi-usage"]);

      const second = await runOfflineWorkflow({
        root,
        runId: "00000000-0000-4000-8000-000000000090",
        runLockHash: "a".repeat(64),
        failSkill: "kibi-freshness",
      });
      expect(second.completedSkills).toEqual(["kibi-usage"]);
      const ledger = await readFile(join(root, "ledger.jsonl"), "utf8");
      expect(ledger.match(/"category":"development"/g)).toHaveLength(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("completes all four skills and bundle through the fake surface", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-complete-"));
    try {
      const result = await runOfflineWorkflow({
        root,
        runId: "00000000-0000-4000-8000-000000000091",
        runLockHash: "b".repeat(64),
      });
      expect(result.phase).toBe("complete");
      expect(result.completedSkills).toHaveLength(4);
      expect(result.bundle).toBe(true);
      expect(await readFile(join(root, "state.json"), "utf8")).toContain(
        '"phase":"complete"',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
