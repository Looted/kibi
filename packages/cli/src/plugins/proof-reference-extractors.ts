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

import { statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  type ProjectKibiConfig,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  type ReferenceExtractorV1,
} from "kibi-plugin-sdk";
import { APPROVED_SOURCE_ANALYZERS } from "./approved-source-analyzers.js";
import { loadPluginPackage } from "./load-plugin.js";
import { verifyApprovedSourceAnalyzer } from "./maintenance-source-analysis.js";
import { readProjectKibiConfig } from "./project-config.js";
import { resolveProjectLocalPackage } from "./resolve-package.js";

/** The plugin Kibi suggests for reading references of these languages. */
export const REFERENCE_PLUGIN_PACKAGE = "kibi-plugin-treesitter";

export type ProofReferenceExtractors = Readonly<{
  extractors: readonly ReferenceExtractorV1[];
  /** Why a configured provider was not used, for the refusal text. */
  problems: readonly string[];
}>;

/**
 * Load the reference extractors a proof may use: providers activated for
 * kibi.reference-extractor.v1 whose installed bytes match a release-qualified
 * closure. A proof is evidence, so an unqualified or modified provider is
 * never imported; the read is refused instead and names the reason.
 */
// implements REQ-kibi-tree-sitter-references
export async function loadProofReferenceExtractors(
  workspaceRoot: string,
): Promise<ProofReferenceExtractors> {
  const problems: string[] = [];
  let entries: NonNullable<ProjectKibiConfig["plugins"]>;
  try {
    entries = (readProjectKibiConfig(workspaceRoot).plugins ?? []).filter(
      (entry) => entry.capabilities[REFERENCE_EXTRACTOR_CAPABILITY_ID],
    );
  } catch (error) {
    return {
      extractors: [],
      problems: [error instanceof Error ? error.message : String(error)],
    };
  }
  const extractors: ReferenceExtractorV1[] = [];
  for (const entry of entries) {
    try {
      const approval = APPROVED_SOURCE_ANALYZERS.find(
        (item) => item.packageName === entry.package,
      );
      if (!approval)
        throw new Error(
          `${entry.package} is not a release-qualified reference reader`,
        );
      const resolved = resolveProjectLocalPackage(workspaceRoot, entry.package);
      const entryRelative = relative(
        resolved.packageRoot,
        resolved.entryPath,
      ).replaceAll("\\", "/");
      if (!approval.files[entryRelative])
        throw new Error(
          `${entry.package}'s entrypoint is outside its qualified closure`,
        );
      verifyApprovedSourceAnalyzer(resolved.packageRoot, approval);
      const loaded = await loadPluginPackage(workspaceRoot, entry.package);
      const extractor = loaded.plugin.capabilities.referenceExtractor;
      if (extractor === undefined)
        throw new Error(
          `${entry.package} ${loaded.plugin.version} has no reference extractor`,
        );
      extractors.push(extractor);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { extractors, problems };
}

const cache = new Map<string, Promise<ProofReferenceExtractors>>();

/** Replaceable loader, so tests can supply providers without installing a package. */
export const proofReferenceExtractorLoader: {
  load: (workspaceRoot: string) => Promise<ProofReferenceExtractors>;
} = {
  load(workspaceRoot) {
    // A changed package.json (a plugin installed or activated) loads afresh.
    let stamp = "";
    try {
      stamp = String(statSync(join(workspaceRoot, "package.json")).mtimeMs);
    } catch {
      stamp = "none";
    }
    const key = `${workspaceRoot}\0${stamp}`;
    let loaded = cache.get(key);
    if (loaded === undefined) {
      loaded = loadProofReferenceExtractors(workspaceRoot);
      cache.set(key, loaded);
    }
    return loaded;
  },
};
