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
  const missing: string[] = [];
  const workspaceVersion = (name: string, relPath: string): string => {
    try {
      const pkg = JSON.parse(readFs(new URL(relPath, baseUrl), "utf-8")) as {
        version?: unknown;
      };
      if (typeof pkg.version === "string") return pkg.version;
    } catch {
      // unreadable or not JSON: unknown below
    }
    missing.push(name);
    return "unknown";
  };
  const versions = {
    opencode: workspaceVersion("opencode", "../package.json"),
    mcp: workspaceVersion("mcp", "../../mcp/package.json"),
    cli: workspaceVersion("cli", "../../cli/package.json"),
    core: workspaceVersion("core", "../../core/package.json"),
  };

  // Only claim workspace-packages if at least one resolved
  if (missing.length < 4) {
    return { ...versions, source: "workspace-packages", missing };
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
