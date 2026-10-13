// executable_for TEST-kibi-schema6-migration-cli
import { describe, expect, test } from "bun:test";
import { isBacklogAction } from "../../src/commands/migrate.js";

describe("kibi migrate plan sections", () => {
  test("keeps quality and coverage reviews out of the migration", () => {
    for (const code of [
      "quality_coverage_depth_review",
      "quality_rule.subject-key-shape",
      "coverage_production_coverage",
      "coverage_proof_evidence",
      "review_adr_unlinked",
      "review_scenario_feasibility_unknown",
    ]) {
      expect(isBacklogAction({ code })).toBe(true);
    }
    for (const code of [
      "schema_config_upgrade",
      "source_path_rewrite",
      "review_source_path_dangling",
      "review_supersession_cycle",
      "semantic_inventory_rederive",
      "symbol_legacy_link_mark",
      "freshness_resync",
      "migration_sync",
    ]) {
      expect(isBacklogAction({ code })).toBe(false);
    }
  });
});
