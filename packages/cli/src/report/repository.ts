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

/** A capture group of a successful match; every group below is mandatory. */
function firstCapture(match: RegExpMatchArray, index: number): string {
  return (match[index] as string).trim();
}

function stripGitSuffix(value: string): string {
  return value.replace(/\.git$/i, "").replace(/\/+$/, "");
}

export function parseGitRemote(url: string):
  | Readonly<{
      identity: string;
      webUrl: string;
      provider: ReportRepositoryProvider;
    }>
  | undefined {
  // An empty url matches none of the patterns below.
  const trimmed = url.trim();

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
  const commitSha = input.commitSha?.trim();
  const branch = input.branch?.trim();
  return {
    ...(selected ?? {}),
    ...(commitSha ? { commitSha } : {}),
    ...(branch ? { branch } : {}),
  };
}

export function shortCommitSha(sha: string | undefined): string | undefined {
  const value = sha?.trim();
  if (!value) return undefined;
  return value.slice(0, 12);
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** A whole line number; Number.isInteger is false for every non-number. */
function isLine(value: unknown, after: number): value is number {
  return Number.isInteger(value) && (value as number) > after;
}

function lineFragment(coordinate: SourceCoordinate): string {
  const start = coordinate.line;
  if (!isLine(start, 0)) return "";
  const end = coordinate.endLine;
  return isLine(end, start) ? `#L${start}-L${end}` : `#L${start}`;
}

export function commitWebUrl(
  repository: ReportRepository | undefined,
): string | undefined {
  if (repository === undefined) return undefined;
  const webUrl = repository.webUrl?.replace(/\/+$/, "");
  const sha = repository.commitSha?.trim();
  if (!webUrl || !sha) return undefined;
  if (repository.provider === "github")
    return `${webUrl}/commit/${encodeURIComponent(sha)}`;
  if (repository.provider === "gitlab")
    return `${webUrl}/-/commit/${encodeURIComponent(sha)}`;
  return undefined;
}

export function sourceWebUrl(
  repository: ReportRepository | undefined,
  coordinate: SourceCoordinate | undefined,
): string | undefined {
  if (repository === undefined || coordinate === undefined) return undefined;
  const path = coordinate.path?.trim();
  const webUrl = repository.webUrl?.replace(/\/+$/, "");
  if (!path || !webUrl || path.includes("://")) return undefined;
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

export function formatSourceCoordinate(
  coordinate: SourceCoordinate | undefined,
): string | undefined {
  if (coordinate === undefined) return undefined;
  const path = coordinate.path?.trim();
  if (!path) return undefined;
  const start = coordinate.line;
  if (!isLine(start, 0)) return path;
  const end = coordinate.endLine;
  return isLine(end, start) ? `${path}:${start}-${end}` : `${path}:${start}`;
}
