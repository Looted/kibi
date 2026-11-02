import { SYMBOL_EXTRACTOR_V2_CAPABILITY_ID } from "kibi-plugin-sdk";
import { APPROVED_SOURCE_ANALYZERS } from "./approved-source-analyzers.js";
import { verifyApprovedSourceAnalyzer } from "./maintenance-source-analysis.js";
import { readProjectKibiConfig } from "./project-config.js";
import { resolveProjectLocalPackage } from "./resolve-package.js";

/**
 * Each plugin package.json#kibi.plugins declares must be installed in the
 * workspace, and a release-qualified source analyzer must be the exact build
 * this Kibi pins: otherwise every refresh drops symbol coordinates and every
 * proof that needs the plugin is refused. Resolution reads package.json and
 * hashes the pinned files; it never imports plugin code.
 */
// implements REQ-cli-doctor, REQ-capability-plugin-activation-disclosure-v1
export function pluginInstallProblems(
  workspaceRoot: string,
  packages: readonly string[],
): { problem: string; fix: string }[] {
  const problems: { problem: string; fix: string }[] = [];
  for (const packageName of packages) {
    let resolved: ReturnType<typeof resolveProjectLocalPackage>;
    try {
      resolved = resolveProjectLocalPackage(workspaceRoot, packageName);
    } catch {
      problems.push({
        problem: `${packageName} is declared but not installed`,
        fix: `Install the declared plugins (npm install in ${workspaceRoot}); until then kibi sync --refresh-symbol-coordinates drops the coordinates it places and proofs that need ${packageName} are refused.`,
      });
      continue;
    }
    const approval = APPROVED_SOURCE_ANALYZERS.find(
      (item) => item.packageName === packageName,
    );
    if (approval === undefined) continue;
    try {
      verifyApprovedSourceAnalyzer(resolved.packageRoot, approval);
    } catch (error) {
      // Resolution already parsed the package.json; its version only names
      // the build, since the hash check already failed.
      const installed =
        typeof resolved.packageJson.version === "string"
          ? resolved.packageJson.version
          : "unknown version";
      const reason = error instanceof Error ? error.message : String(error);
      problems.push({
        problem: `installed ${packageName} ${installed} is not the release-qualified build this Kibi pins (${packageName} ${approval.version}: ${reason})`,
        fix: `Remove node_modules/${packageName} and install the build qualified with this Kibi release (npm install --save-dev ${packageName}@${approval.version}); if the registry's ${approval.version} is another build, upgrade kibi-cli and ${packageName} together. Until then symbol refresh and proofs through ${packageName} fail.`,
      });
    }
  }
  return problems;
}

/**
 * The install problems of the plugins package.json#kibi.plugins activates
 * for symbol extraction. An explicit coordinate refresh refuses on any of
 * them rather than replacing every coordinate those plugins place.
 */
// implements REQ-symbol-coordinates-derived-locally
export function sourceAnalyzerInstallProblems(
  workspaceRoot: string,
): { problem: string; fix: string }[] {
  const packages = [
    ...new Set(
      (readProjectKibiConfig(workspaceRoot).plugins ?? [])
        .filter(
          (entry) => entry.capabilities[SYMBOL_EXTRACTOR_V2_CAPABILITY_ID],
        )
        .map((entry) => entry.package),
    ),
  ];
  return pluginInstallProblems(workspaceRoot, packages);
}
