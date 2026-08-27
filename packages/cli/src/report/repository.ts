export type ReportGitRemote = Readonly<{
  name: string;
  url: string;
}>;

export type ReportRepositoryProvider = "github" | "gitlab" | "unknown";

export type ReportRepository = Readonly<{
  identity?: string;
  webUrl?: string;
  provider?: ReportRepositoryProvider;
  commitSha?: string;
  branch?: string;
}>;

export type SourceCoordinate = Readonly<{
  id?: string;
  path?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}>;

function firstCapture(match: RegExpMatchArray | null, index: number): string {
  return match?.[index]?.trim() ?? "";
}

function stripGitSuffix(value: string): string {
  return value.replace(/\.git$/i, "").replace(/\/+$/, "");
}

// implements REQ-kibi-html-health-report
export function parseGitRemote(url: string):
  | Readonly<{
      identity: string;
      webUrl: string;
      provider: ReportRepositoryProvider;
    }>
  | undefined {
  const trimmed = url.trim();
  if (trimmed.length === 0) return undefined;

  const github = trimmed.match(
    /^(?:https?:\/\/(?:www\.)?|git@|ssh:\/\/(?:git@)?|git:\/\/)github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
  );
  if (github) {
    const owner = firstCapture(github, 1);
    const repo = stripGitSuffix(firstCapture(github, 2));
    if (!owner || !repo || owner.includes(":") || repo.includes(" ")) {
      return undefined;
    }
    return {
      identity: `${owner}/${repo}`,
      webUrl: `https://github.com/${owner}/${repo}`,
      provider: "github",
    };
  }

  const gitlabHttps = trimmed.match(
    /^https?:\/\/(?:www\.)?(gitlab\.com)\/(.+?)(?:\.git)?\/?$/i,
  );
  const gitlabSsh = trimmed.match(
    /^(?:git@|ssh:\/\/(?:git@)?)(gitlab\.com)[:/](.+?)(?:\.git)?\/?$/i,
  );
  const gitlab = gitlabHttps ?? gitlabSsh;
  if (gitlab) {
    const identity = stripGitSuffix(firstCapture(gitlab, 2));
    if (!identity || identity.includes(" ")) return undefined;
    return {
      identity,
      webUrl: `https://gitlab.com/${identity}`,
      provider: "gitlab",
    };
  }

  const genericHttps = trimmed.match(
    /^https?:\/\/([^/]+)\/(.+?)(?:\.git)?\/?$/i,
  );
  if (genericHttps) {
    const host = firstCapture(genericHttps, 1).toLowerCase();
    const identity = stripGitSuffix(firstCapture(genericHttps, 2));
    if (!host || !identity || identity.includes(" ")) return undefined;
    return {
      identity,
      webUrl: `https://${host}/${identity}`,
      provider: "unknown",
    };
  }

  const genericSsh = trimmed.match(
    /^(?:git@|ssh:\/\/(?:git@)?)([^:/]+)[:/](.+?)(?:\.git)?\/?$/i,
  );
  if (genericSsh) {
    const host = firstCapture(genericSsh, 1).toLowerCase();
    const identity = stripGitSuffix(firstCapture(genericSsh, 2));
    if (!host || !identity || identity.includes(" ")) return undefined;
    return {
      identity,
      webUrl: `https://${host}/${identity}`,
      provider: "unknown",
    };
  }

  return undefined;
}

export function resolveReportRepository(input: {
  remotes?: readonly ReportGitRemote[];
  commitSha?: string;
  branch?: string;
}): ReportRepository {
  const remotes = input.remotes ?? [];
  const parsed = remotes
    .map((remote) => ({ remote, repo: parseGitRemote(remote.url) }))
    .filter(
      (
        entry,
      ): entry is {
        remote: ReportGitRemote;
        repo: NonNullable<ReturnType<typeof parseGitRemote>>;
      } => entry.repo !== undefined,
    );
  const origin = parsed.find((entry) => entry.remote.name === "origin");
  const selected = origin?.repo ?? parsed[0]?.repo;
  const commitSha = input.commitSha?.trim() || undefined;
  const branch = input.branch?.trim() || undefined;
  return {
    ...(selected ?? {}),
    ...(commitSha ? { commitSha } : {}),
    ...(branch ? { branch } : {}),
  };
}

// implements REQ-kibi-html-health-report
export function shortCommitSha(sha: string | undefined): string | undefined {
  const value = sha?.trim();
  if (!value) return undefined;
  return value.length > 12 ? value.slice(0, 12) : value;
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function lineFragment(coordinate: SourceCoordinate): string {
  const start = coordinate.line;
  if (typeof start !== "number" || !Number.isInteger(start) || start < 1) {
    return "";
  }
  const end = coordinate.endLine;
  if (typeof end === "number" && Number.isInteger(end) && end > start) {
    return `#L${start}-L${end}`;
  }
  return `#L${start}`;
}

// implements REQ-kibi-html-health-report
export function commitWebUrl(
  repository: ReportRepository | undefined,
): string | undefined {
  const webUrl = repository?.webUrl?.replace(/\/+$/, "");
  const sha = repository?.commitSha?.trim();
  if (!repository || !webUrl || !sha) return undefined;
  if (repository.provider === "github")
    return `${webUrl}/commit/${encodeURIComponent(sha)}`;
  if (repository.provider === "gitlab")
    return `${webUrl}/-/commit/${encodeURIComponent(sha)}`;
  return undefined;
}

// implements REQ-kibi-html-health-report
export function sourceWebUrl(
  repository: ReportRepository | undefined,
  coordinate: SourceCoordinate | undefined,
): string | undefined {
  const path = coordinate?.path?.trim();
  const webUrl = repository?.webUrl?.replace(/\/+$/, "");
  if (!repository || !coordinate || !path || !webUrl || path.includes("://")) {
    return undefined;
  }
  const revision = repository.commitSha?.trim() || repository.branch?.trim();
  if (!revision) return undefined;
  const encodedPath = encodePath(path);
  const encodedRev = encodeURIComponent(revision);
  const fragment = lineFragment(coordinate);
  if (repository.provider === "github") {
    return `${webUrl}/blob/${encodedRev}/${encodedPath}${fragment}`;
  }
  if (repository.provider === "gitlab") {
    return `${webUrl}/-/blob/${encodedRev}/${encodedPath}${fragment}`;
  }
  return undefined;
}

// implements REQ-kibi-html-health-report
export function formatSourceCoordinate(
  coordinate: SourceCoordinate | undefined,
): string | undefined {
  const path = coordinate?.path?.trim();
  if (!path) return undefined;
  const start = coordinate?.line;
  if (typeof start === "number" && Number.isInteger(start) && start >= 1) {
    const end = coordinate?.endLine;
    if (typeof end === "number" && Number.isInteger(end) && end > start) {
      return `${path}:${start}-${end}`;
    }
    return `${path}:${start}`;
  }
  return path;
}
