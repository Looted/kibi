import { readFileSync as fsReadFileSync } from "node:fs";

export interface KibiPackageVersions {
  opencode: string;
  mcp: string;
  cli: string;
  core: string;
  source: "generated-dist" | "workspace-packages" | "unknown";
  missing: string[];
}

export interface ReadKibiPackageVersionsOptions {
  baseUrl?: string | URL;
  readFileSync?: (path: string | URL, encoding: "utf-8") => string;
}

// implements REQ-opencode-toast-package-versions-v1
export function readKibiPackageVersions(
  options?: ReadKibiPackageVersionsOptions,
): KibiPackageVersions {
  const baseUrl = options?.baseUrl ?? import.meta.url;
  const readFs = options?.readFileSync ?? fsReadFileSync;

  // Tier 1: generated dist JSON (build-time artifact)
  try {
    const distUrl = new URL("./version-metadata.json", baseUrl);
    const raw = readFs(distUrl, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, string | undefined>;
    if (
      typeof parsed.opencode === "string" &&
      typeof parsed.mcp === "string" &&
      typeof parsed.cli === "string" &&
      typeof parsed.core === "string"
    ) {
      return {
        opencode: parsed.opencode,
        mcp: parsed.mcp,
        cli: parsed.cli,
        core: parsed.core,
        source: "generated-dist",
        missing: [],
      };
    }
  } catch {
    // fall through
  }

  // Tier 2: workspace package.json files
  try {
    const entries: Array<[string, string]> = [
      ["opencode", "../package.json"],
      ["mcp", "../../mcp/package.json"],
      ["cli", "../../cli/package.json"],
      ["core", "../../core/package.json"],
    ];

    const versions: Record<string, string> = {};
    const missing: string[] = [];

    for (const [name, relPath] of entries) {
      try {
        const pkgUrl = new URL(relPath, baseUrl);
        const raw = readFs(pkgUrl, "utf-8");
        const pkg = JSON.parse(raw) as { version?: unknown };
        versions[name] =
          typeof pkg.version === "string" ? pkg.version : "unknown";
        if (typeof pkg.version !== "string") {
          missing.push(name);
        }
      } catch {
        versions[name] = "unknown";
        missing.push(name);
      }
    }

    // Only claim workspace-packages if at least one resolved
    if (Object.values(versions).some((v) => v !== "unknown")) {
      return {
        opencode: versions.opencode ?? "unknown",
        mcp: versions.mcp ?? "unknown",
        cli: versions.cli ?? "unknown",
        core: versions.core ?? "unknown",
        source: "workspace-packages",
        missing: missing.length > 0 ? missing : [],
      };
    }
  } catch {
    // fall through
  }

  // Tier 3: all unknown — never throws
  return {
    opencode: "unknown",
    mcp: "unknown",
    cli: "unknown",
    core: "unknown",
    source: "unknown",
    missing: ["opencode", "mcp", "cli", "core"],
  };
}
