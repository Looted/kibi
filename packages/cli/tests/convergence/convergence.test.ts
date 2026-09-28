/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { kibiPlugin as builtinPlugin } from "kibi-plugin-builtin";
import { type JevClient, createJevPlugin } from "kibi-plugin-jev";
import {
  type KibiPluginV1,
  VOCABULARY_ALIGNMENT_CAPABILITY_ID,
} from "kibi-plugin-sdk";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import {
  type ConvergenceCorpus,
  type ConvergenceReport,
  formatConvergenceReport,
  runConvergenceHarness,
} from "./harness.js";

const corpus = JSON.parse(
  readFileSync(path.join(import.meta.dir, "paraphrase-groups.json"), "utf8"),
) as ConvergenceCorpus;

const expectedSubjectByGroup = new Map(
  corpus.groups.map((group) => [group.id, group.expectedSubjectKey]),
);
const equivalentGroups = new Set(
  corpus.groups
    .filter((group) => group.converge || group.kind === "property_gap")
    .map((group) => group.id),
);

/**
 * Stand-in for a capable model: picks the group's intended subject when the
 * builtin ranker offered it, and recognizes paraphrases inside equivalent
 * groups. It shows what the provider path can add on top of builtin recall;
 * it is not a measurement of Jev itself (see
 * documentation/evaluations/vocabulary-convergence.md for the live eval).
 */
function oracleJevClient(): JevClient {
  return {
    systemOne: async (request) => {
      const answers: Record<string, unknown> = {};
      for (const [key, question] of Object.entries(request.questions)) {
        const [, rest = ""] = key.split(/:(.*)/s);
        const groupId = rest.split("#")[0] ?? "";
        if (key.startsWith("subject:")) {
          const criteria = (question as { criteria?: Record<string, string> })
            .criteria;
          const expected = expectedSubjectByGroup.get(groupId);
          answers[key] = {
            choice:
              expected !== undefined && criteria?.[expected] !== undefined
                ? expected
                : "new_subject",
          };
        } else {
          answers[key] = { noul: equivalentGroups.has(groupId) ? 0.9 : 0.05 };
        }
      }
      return { answers: answers as never };
    },
  };
}

function registry(jev: boolean): CapabilityRegistry {
  return new CapabilityRegistry({
    workspaceRoot: process.cwd(),
    builtinFactory: () => builtinPlugin as KibiPluginV1,
    projectConfig: jev
      ? {
          plugins: [
            {
              package: "kibi-plugin-jev",
              capabilities: {
                [VOCABULARY_ALIGNMENT_CAPABILITY_ID]: { mode: "replace" },
              },
            },
          ],
        }
      : {},
    loadPlugin: async (_root, packageName) => ({
      packageName,
      plugin: createJevPlugin({
        clientFactory: oracleJevClient,
        model: "jev-oracle-fixture",
      }) as KibiPluginV1,
      resolved: {
        packageName,
        packageRoot: `/tmp/${packageName}`,
        packageJsonPath: `/tmp/${packageName}/package.json`,
        packageJson: { name: packageName },
        entryPath: `/tmp/${packageName}/index.js`,
        entryUrl: `file:///tmp/${packageName}/index.js`,
      },
    }),
  });
}

function publish(report: ConvergenceReport): void {
  console.log(formatConvergenceReport(report));
  const target = process.env.KIBI_CONVERGENCE_REPORT;
  if (target) {
    writeFileSync(
      target.replace("{mode}", report.mode),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }
}

// executable_for TEST-kibi-vocabulary-convergence-harness
describe("vocabulary convergence harness", () => {
  test("builtin: unit variants converge, controls never do", async () => {
    const report = await runConvergenceHarness({
      corpus,
      registry: registry(false),
      mode: "builtin",
    });
    publish(report);
    const byId = new Map(report.groups.map((group) => [group.id, group]));
    // Unit canonicalization alone must converge pure unit variants.
    for (const id of ["session-ttl-units", "upload-size-units"]) {
      expect(byId.get(id)?.signatureConverged).toBe(true);
      expect(byId.get(id)?.redundancyDetected).toBe(true);
    }
    // Different values, Mb vs MB, and property-key paraphrases stay apart.
    expect(report.rates.falsePositive).toBe(0);
    expect(byId.get("cache-ttl-property-gap")?.signatureConverged).toBe(false);
    // Every converged equivalent group is also reported by domain-redundancy.
    expect(report.rates.redundancyDetection).toBe(
      report.rates.signatureConvergence,
    );
    expect(report.rates.signatureConvergence).toBeGreaterThanOrEqual(0.5);
  }, 120_000);

  test("injected Jev client improves convergence without false positives", async () => {
    const builtin = await runConvergenceHarness({
      corpus,
      registry: registry(false),
      mode: "builtin",
    });
    const report = await runConvergenceHarness({
      corpus,
      registry: registry(true),
      mode: "jev-fake",
    });
    publish(report);
    expect(report.rates.signatureConvergence).toBeGreaterThanOrEqual(
      builtin.rates.signatureConvergence,
    );
    expect(report.rates.reviewRecall).toBeGreaterThanOrEqual(
      builtin.rates.reviewRecall,
    );
    expect(report.rates.falsePositive).toBe(0);
  }, 120_000);
});
