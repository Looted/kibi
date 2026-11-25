#!/usr/bin/env bun
/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Retrieval replay: ranks the replay cases against a store with each
// retriever, at each store size, and prints one row per suite.
//
//   bun scripts/retrieval-eval/run.ts --store <dir holding .kb> \
//     --suites decision-questions,synthetic-change --retrievers kibi-search-today \
//     --scale 1,10 [--split dev|holdout|report|all] [--json out.json]

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  type Retriever,
  editHookBaseline,
  kibiSearchBaseline,
} from "./baseline.js";
import { cardsRetriever } from "./cards.js";
import { type ReplayCase, replayCases } from "./cases.js";
import {
  type CaseResult,
  formatSummary,
  rankOf,
  summarize,
} from "./metrics.js";
import { scaleStore } from "./scale.js";
import { loadStore } from "./store.js";

function retrievers(workspace?: string): Record<string, Retriever> {
  const scoped = (name: string, vectors: boolean, noScope = false) =>
    cardsRetriever(name, {
      vectors,
      noScope,
      ...(workspace ? { workspace } : {}),
    });
  return Object.fromEntries(
    [
      kibiSearchBaseline,
      editHookBaseline,
      scoped("cards-words", false),
      scoped("cards-fused", true),
      scoped("cards-words-noscope", false, true),
      scoped("cards-fused-noscope", true, true),
    ].map((retriever) => [retriever.name, retriever]),
  );
}

function allCases(): ReplayCase[] {
  return replayCases();
}

export async function replay(
  options: Readonly<{
    store: string;
    suites: readonly string[];
    retrievers: readonly string[];
    scales: readonly number[];
    split: string;
    hideExpectedLinks?: boolean;
    workspace?: string;
  }>,
) {
  const cases = allCases().filter(
    (c) =>
      options.suites.includes(c.suite) &&
      (options.split === "all" || c.split === options.split),
  );
  const base = loadStore(options.store);
  const keep = new Set(cases.flatMap((c) => c.expectedIds));
  const report: Array<{
    retriever: string;
    scale: number;
    suite: string;
    summary: ReturnType<typeof summarize>;
  }> = [];
  for (const scale of options.scales) {
    const store = scaleStore(base, scale, keep);
    for (const name of options.retrievers) {
      const retriever = retrievers(options.workspace)[name];
      if (!retriever) throw new Error(`unknown retriever ${name}`);
      // With hidden links, each case runs against a store where only its own
      // expected decisions lost their code links.
      const runs = new Map<string, Awaited<ReturnType<Retriever["prepare"]>>>();
      const runFor = async (replayCase: ReplayCase) => {
        const key = options.hideExpectedLinks
          ? replayCase.expectedIds.join(",")
          : "";
        let run = runs.get(key);
        if (!run) {
          const hidden = new Set(replayCase.expectedIds);
          run = await retriever.prepare(
            options.hideExpectedLinks
              ? {
                  ...store,
                  edges: store.edges.filter(
                    (edge) =>
                      !(
                        edge.relationship === "implements" &&
                        hidden.has(edge.to)
                      ),
                  ),
                }
              : store,
          );
          runs.set(key, run);
        }
        return run;
      };
      for (const suite of options.suites) {
        const results: CaseResult[] = [];
        for (const replayCase of cases.filter((c) => c.suite === suite)) {
          if (replayCase.control) continue;
          const started = performance.now();
          const run = await runFor(replayCase);
          const answer = await run(replayCase);
          results.push({
            case: replayCase,
            rank: rankOf(answer.rows, replayCase.expectedIds),
            rows: answer.rows.slice(0, 10),
            ...(answer.chars !== undefined ? { chars: answer.chars } : {}),
            ms: performance.now() - started,
          });
        }
        if (results.length === 0) continue;
        const summary = summarize(results);
        report.push({ retriever: name, scale, suite, summary });
        console.log(
          formatSummary(`${name} x${scale} ${suite}`, summary),
          summary.weakestGroup ? ` (${summary.weakestGroup.slice(0, 40)})` : "",
        );
      }
    }
  }
  return report;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      store: { type: "string" },
      suites: { type: "string" },
      retrievers: { type: "string", default: kibiSearchBaseline.name },
      scale: { type: "string", default: "1" },
      split: { type: "string", default: "dev" },
      "hide-expected-links": { type: "boolean", default: false },
      json: { type: "string" },
      workspace: { type: "string" },
    },
  });
  if (!values.store || !values.suites) {
    console.error("usage: run.ts --store <dir> --suites <a,b> [options]");
    process.exit(2);
  }
  const report = await replay({
    store: values.store,
    suites: values.suites.split(","),
    retrievers: values.retrievers.split(","),
    scales: values.scale.split(",").map(Number),
    split: values.split,
    hideExpectedLinks: values["hide-expected-links"],
    ...(values.workspace ? { workspace: values.workspace } : {}),
  });
  if (values.json) writeFileSync(values.json, JSON.stringify(report, null, 2));
}
