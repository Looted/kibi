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
import { join, relative, sep } from "node:path";
import {
  type ProjectKibiConfig,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  type ReferenceExtractorV1,
} from "kibi-plugin-sdk";
import {
  APPROVED_SOURCE_ANALYZERS,
  type ApprovedSourceAnalyzer,
} from "./approved-source-analyzers.js";
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
  /** The release-qualified closures; replaceable so tests can qualify a stub. */
  approvals: readonly ApprovedSourceAnalyzer[] = APPROVED_SOURCE_ANALYZERS,
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
      const approval = approvals.find(
        (item) => item.packageName === entry.package,
      );
      if (!approval)
        throw new Error(
          `${entry.package} is not a release-qualified reference reader`,
        );
      const resolved = resolveProjectLocalPackage(workspaceRoot, entry.package);
      const entryRelative = relative(resolved.packageRoot, resolved.entryPath)
        .split(sep)
        .join("/");
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

function mtimeOf(path: string): number | undefined {
  let mtime: number | undefined;
  try {
    mtime = statSync(path).mtimeMs;
  } catch {
    // An absent or unreadable file has no mtime.
  }
  return mtime;
}

// implements REQ-kibi-tree-sitter-references
export type ProofReferenceExtractorLoader = {
  /** The release-qualified closures the default load checks against. */
  approvals: readonly ApprovedSourceAnalyzer[];
  load: (workspaceRoot: string) => Promise<ProofReferenceExtractors>;
};

/**
 * The real loader. The shared loader starts as one, and a test restores it
 * from a new one, so both read the same definition.
 */
// implements REQ-kibi-tree-sitter-references
export function realProofReferenceExtractorLoader(): ProofReferenceExtractorLoader {
  return {
    approvals: APPROVED_SOURCE_ANALYZERS,
    load(workspaceRoot) {
      // A changed package.json (a plugin activated) or an installed plugin
      // whose manifest changed (installed, upgraded) loads afresh.
      const key = JSON.stringify([
        workspaceRoot,
        mtimeOf(join(workspaceRoot, "package.json")),
        mtimeOf(
          join(
            workspaceRoot,
            "node_modules",
            REFERENCE_PLUGIN_PACKAGE,
            "package.json",
          ),
        ),
      ]);
      let loaded = cache.get(key);
      if (loaded === undefined) {
        loaded = loadProofReferenceExtractors(
          workspaceRoot,
          proofReferenceExtractorLoader.approvals,
        );
        cache.set(key, loaded);
        // Only a load that found every provider is kept: a refusal is read
        // again next time, so a fix is seen without restarting the host. While
        // a load is pending the cache returns it, so nothing replaces it first.
        void loaded.then((result) => {
          if (result.problems.length > 0 || result.extractors.length === 0)
            cache.delete(key);
        });
      }
      return loaded;
    },
  };
}

/** Replaceable loader, so tests can supply providers without installing a package. */
export const proofReferenceExtractorLoader: ProofReferenceExtractorLoader =
  realProofReferenceExtractorLoader();
