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

/**
 * Remediation advice that every impact diagnostic of one kind shares, apart
 * from the ids it names. A template's `{name}` placeholders are filled with
 * the diagnostic's own values to give its suggestion; `shared` says, for
 * each placeholder, which field of the diagnostic holds that value, so one
 * copy of the advice can stand for every diagnostic it fits.
 */
export type AdviceTemplate = Readonly<{
  text: string;
  shared: Readonly<Record<string, string>>;
}>;

export const STATEMENT_UNVERIFIED_FIRM_ADVICE: AdviceTemplate = {
  text: "Confirm the changed code still does what {requirement} says. If it no longer does, the request conflicts with a rule a person set: stop and ask whether to change {requirement}; change it only with their words in origin.ref, and say in the final answer which rule changed.",
  shared: { requirement: "the requirement in entityId" },
};

export const STATEMENT_UNVERIFIED_ADVICE: AdviceTemplate = {
  text: "Confirm the changed code still does what {requirement} says. If it no longer does, the request conflicts with a recorded rule: ask whether to change {requirement} before keeping the change, then supersede or update it in the same change with the person's words, and say in the final answer which rule changed.",
  shared: { requirement: "the requirement in entityId" },
};

export const SEMANTIC_REVIEW_ADVICE: AdviceTemplate = {
  text: "Use kb_search and kb_query for {file}, then verify that {linked} actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.",
  shared: {
    file: "the file in files",
    linked: "the entities the message names",
  },
};

export const SEMANTIC_REVIEW_UNLINKED_ADVICE: AdviceTemplate = {
  text: 'If the change adds or alters behavior, record it as part of this change; that is part of finishing it, not a separate request, so it needs no permission: kb_search({query:"<the behavior>", sourceLocations:[{path:"{file}"}]}) for a requirement that already describes it and link {symbol} to it; if none does, kb_upsert a requirement with a scenario and link the symbol with implements. If behavior is unchanged (a refactor, renaming), say so in the final report instead.',
  shared: {
    file: "<the file in files>",
    symbol: "the symbol in evidence.symbol",
  },
};

const TEMPLATES: readonly AdviceTemplate[] = [
  STATEMENT_UNVERIFIED_FIRM_ADVICE,
  STATEMENT_UNVERIFIED_ADVICE,
  SEMANTIC_REVIEW_ADVICE,
  SEMANTIC_REVIEW_UNLINKED_ADVICE,
];

const PLACEHOLDER = /\{(\w+)\}/g;

/** The template's text with each placeholder replaced by its value. */
export function fillAdvice(
  template: AdviceTemplate,
  values: Readonly<Record<string, string>>,
): string {
  return template.text.replace(
    PLACEHOLDER,
    (whole, name: string) => values[name] ?? whole,
  );
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MATCHERS = TEMPLATES.map((template) => ({
  template,
  pattern: new RegExp(
    `^${template.text
      .split(PLACEHOLDER)
      .map((part, index) => (index % 2 === 1 ? "(.+?)" : escapeRegExp(part)))
      .join("")}$`,
    "s",
  ),
}));

/**
 * The advice a suggestion shares with every diagnostic of its kind, its
 * placeholders naming the diagnostic fields that hold the values, or
 * undefined for a suggestion no template gives.
 */
export function sharedAdviceOf(suggestion: string): string | undefined {
  for (const { template, pattern } of MATCHERS) {
    if (pattern.test(suggestion)) return fillAdvice(template, template.shared);
  }
  return undefined;
}
