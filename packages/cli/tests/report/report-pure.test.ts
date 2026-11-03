import { describe, expect, test } from "bun:test";
import {
  KIBI_BRAND,
  renderKibiBadge,
  renderKibiFaviconDataUri,
  renderKibiFaviconSvg,
  renderKibiLogo,
  renderKibiWordmark,
} from "../../src/report/brand.js";
import {
  formatAbsoluteUtc,
  formatRelativeAge,
  parseTimestamp,
} from "../../src/report/relative-time.js";
import {
  PROOF_GATE_KEYS,
  REPORT_FILTERS,
  matchesReportView,
  reportFilterCounts,
} from "../../src/report/report-view.js";
import {
  commitWebUrl,
  formatSourceCoordinate,
  parseGitRemote,
  resolveReportRepository,
  shortCommitSha,
  sourceWebUrl,
} from "../../src/report/repository.js";

describe("relative time", () => {
  test("parses dates and non-blank timestamp strings only", () => {
    const date = new Date("2026-01-02T03:04:05Z");
    expect(parseTimestamp(date)).toBe(date);
    expect(parseTimestamp(new Date(Number.NaN))).toBeUndefined();
    expect(parseTimestamp("2026-01-02T03:04:05Z")?.toISOString()).toBe(
      "2026-01-02T03:04:05.000Z",
    );
    for (const value of ["", "   ", "not a date", 5, null, undefined]) {
      expect(parseTimestamp(value)).toBeUndefined();
    }
  });

  test("formats an absolute UTC minute with zero padding", () => {
    expect(formatAbsoluteUtc(new Date("0987-02-03T04:05:59Z"))).toBe(
      "0987-02-03 04:05 UTC",
    );
    expect(formatAbsoluteUtc(new Date("2026-11-23T14:35:00Z"))).toBe(
      "2026-11-23 14:35 UTC",
    );
  });

  test("formats relative ages at every boundary", () => {
    const at = (seconds: number) =>
      formatRelativeAge(5_000_000, 5_000_000 + seconds * 1000);
    expect(formatRelativeAge(Number.NaN, 0)).toBe("timestamp unavailable");
    expect(formatRelativeAge(0, Number.POSITIVE_INFINITY)).toBe(
      "timestamp unavailable",
    );
    expect(at(-1)).toBe("in the future");
    expect(at(0)).toBe("just now");
    expect(at(59)).toBe("just now");
    expect(at(60)).toBe("1m ago");
    expect(at(3599)).toBe("59m ago");
    expect(at(3600)).toBe("1h ago");
    expect(at(3660)).toBe("1h 1m ago");
    expect(at(86_399)).toBe("23h 59m ago");
    expect(at(86_400)).toBe("1d ago");
    expect(at(90_000)).toBe("1d 1h ago");
    expect(at(6 * 86_400 + 3600)).toBe("6d 1h ago");
    expect(at(7 * 86_400 + 3600)).toBe("7d ago");
  });
});

describe("report view", () => {
  const row = {
    text: "Login Session Timeout",
    states: ["proved", "stale"],
    earliestGate: "e2e" as const,
  };

  test("lists the filters and proof gates", () => {
    expect([...REPORT_FILTERS]).toStrictEqual([
      "all",
      "proved",
      "tested",
      "attention",
      "below_floor",
      "pending_reproof",
      "stale",
      "contradiction",
    ]);
    expect([...PROOF_GATE_KEYS]).toStrictEqual([
      "semantic",
      "scenario",
      "implementation",
      "e2e",
      "evidence",
      "proved",
    ]);
  });

  test("matches on filter, gate and trimmed case-insensitive query", () => {
    const view = { query: "", filter: "all", gate: "all" } as const;
    expect(matchesReportView(row, view)).toBe(true);
    expect(matchesReportView(row, { ...view, query: "  SESSION " })).toBe(true);
    expect(matchesReportView(row, { ...view, query: "nope" })).toBe(false);
    expect(matchesReportView(row, { ...view, filter: "stale" })).toBe(true);
    expect(matchesReportView(row, { ...view, filter: "tested" })).toBe(false);
    expect(matchesReportView(row, { ...view, gate: "e2e" })).toBe(true);
    expect(matchesReportView(row, { ...view, gate: "semantic" })).toBe(false);
  });

  test("counts rows per filter", () => {
    const rows = [
      row,
      { ...row, states: ["tested", "attention", "below_floor"] },
      { ...row, states: ["pending_reproof", "contradiction", "proved"] },
    ];
    expect(reportFilterCounts(rows)).toStrictEqual({
      all: 3,
      proved: 2,
      tested: 1,
      attention: 1,
      below_floor: 1,
      pending_reproof: 1,
      stale: 1,
      contradiction: 1,
    });
  });
});

describe("brand", () => {
  test("logo and wordmark take an escaped optional class", () => {
    expect(renderKibiLogo()).toStartWith(
      '<svg viewBox="0 0 308 309" role="img" aria-label="Kibi logo"><path d="M59.4',
    );
    expect(renderKibiLogo(`a&<>"'`)).toStartWith(
      '<svg class="a&amp;&lt;&gt;&quot;&apos;" viewBox="0 0 308 309"',
    );
    expect(renderKibiLogo()).toEndWith("</svg>");
    expect(renderKibiWordmark()).toStartWith(
      '<svg viewBox="-2 10 395 148" role="img" aria-label="Kibi"><ellipse',
    );
    expect(renderKibiWordmark("w")).toStartWith('<svg class="w" viewBox=');
    expect(renderKibiWordmark()).toContain(`fill="${KIBI_BRAND.signal}"`);
  });

  test("the favicon is the logo as a data URI", () => {
    const svg = renderKibiFaviconSvg();
    expect(svg).toStartWith(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 308 309"><path',
    );
    expect(renderKibiFaviconDataUri()).toBe(
      `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    );
  });

  test("the badge is sized from its text", () => {
    const badge = renderKibiBadge("99% ok", "#4c1");
    expect(badge).toStartWith(
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kibi requirement health: 99% ok" width="115" height="20" viewBox="0 0 115 20">\n  <title>Kibi requirement health: 99% ok</title>',
    );
    expect(badge).toContain(
      '<rect width="58" height="20" fill="#555"/>\n    <rect x="58" width="57" height="20" fill="#4c1"/>\n    <rect width="115" height="20" fill="url(#kibi-badge-s)"/>',
    );
    expect(badge).toContain(
      '<text x="36" y="15" fill="#010101" fill-opacity=".3">kibi</text>\n    <text x="36" y="14" fill="#fff">kibi</text>',
    );
    expect(badge).toContain(
      '<text x="86.5" y="15" fill="#010101" fill-opacity=".3">99% ok</text>',
    );
    expect(badge).toContain(
      '<svg x="5" y="3" width="14" height="14" viewBox="0 0 308 309" aria-hidden="true">',
    );
    expect(badge).toContain('fill="#555"/><ellipse');
    expect(badge).toContain(
      'font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11"',
    );
    expect(badge).not.toContain(`fill="${KIBI_BRAND.carbon}"`);
    expect(renderKibiBadge("<b>", '"x"')).toContain(
      'aria-label="Kibi requirement health: &lt;b&gt;" width="95"',
    );
    expect(renderKibiBadge("<b>", '"x"')).toContain('fill="&quot;x&quot;"');
  });
});

describe("git remotes", () => {
  test("recognises every GitHub remote spelling", () => {
    const github = {
      identity: "acme/kibi",
      webUrl: "https://github.com/acme/kibi",
      provider: "github",
    };
    for (const url of [
      "https://github.com/acme/kibi",
      " http://www.github.com/acme/kibi.git/ ",
      "git@github.com:acme/kibi.git",
      "ssh://git@github.com/acme/kibi",
      "ssh://github.com/acme/kibi",
      "git://github.com/acme/kibi",
      "https://GitHub.com/acme/kibi.git.git",
      "https://github.com/ acme /kibi",
    ]) {
      expect(parseGitRemote(url)).toStrictEqual(github as never);
    }
    for (const url of [
      "xhttps://github.com/acme/kibi",
      "https://github.com/a:b/kibi",
      "https://github.com/acme/ki bi",
      "https://github.com/ /kibi",
      "https://github.com/acme/ .git",
      "",
      "not a url",
    ]) {
      expect(parseGitRemote(url)).toBeUndefined();
    }
  });

  test("recognises GitLab over https and ssh, with subgroups", () => {
    for (const url of [
      "https://gitlab.com/g/sub/repo.git",
      "http://www.gitlab.com/g/sub/repo/",
      "git@gitlab.com:g/sub/repo.git",
      "ssh://gitlab.com/g/sub/repo",
      "ssh://git@gitlab.com/g/sub/repo",
      "https://gitlab.com/g/sub/repo//",
      "https://gitlab.com/g/sub/repo///",
    ]) {
      expect(parseGitRemote(url)).toStrictEqual({
        identity: "g/sub/repo",
        webUrl: "https://gitlab.com/g/sub/repo",
        provider: "gitlab",
      });
    }
    expect(parseGitRemote("https://gitlab.com/g/a b")).toBeUndefined();
    expect(parseGitRemote("xhttps://gitlab.com/g/r")).toBeUndefined();
    expect(parseGitRemote("xgit@gitlab.com:g/r")).toBeUndefined();
  });

  test("other hosts are generic", () => {
    for (const url of [
      "https://Git.Example.com/team/repo.git",
      "http://git.example.com/team/repo/",
      "git@git.example.com:team/repo.git",
      "ssh://git.example.com/team/repo",
      "ssh://git@git.example.com/team/repo",
    ]) {
      expect(parseGitRemote(url)).toStrictEqual({
        identity: "team/repo",
        webUrl: "https://git.example.com/team/repo",
        provider: "unknown",
      });
    }
    expect(parseGitRemote("https://h/a.github/x")).toStrictEqual({
      identity: "a.github/x",
      webUrl: "https://h/a.github/x",
      provider: "unknown",
    });
    for (const url of [
      "https://host/a b",
      "git@host:a b",
      "xhttps://host/a",
      "xgit@host:a",
      "https:// /a",
      "git@ :a",
    ]) {
      expect(parseGitRemote(url)).toBeUndefined();
    }
  });

  test("the report repository prefers origin, then the first parsable remote", () => {
    const remote = (name: string, owner: string) => ({
      name,
      url: `https://github.com/${owner}/r`,
    });
    expect(
      resolveReportRepository({
        remotes: [remote("upstream", "u"), remote("origin", "o")],
        commitSha: " abc ",
        branch: " main ",
      }),
    ).toStrictEqual({
      identity: "o/r",
      webUrl: "https://github.com/o/r",
      provider: "github",
      commitSha: "abc",
      branch: "main",
    });
    expect(
      resolveReportRepository({
        remotes: [{ name: "origin", url: "bad" }, remote("fork", "f")],
        commitSha: "  ",
        branch: "",
      }),
    ).toStrictEqual({
      identity: "f/r",
      webUrl: "https://github.com/f/r",
      provider: "github",
    });
    expect(resolveReportRepository({})).toStrictEqual({});
  });

  test("short SHAs keep twelve characters", () => {
    expect(shortCommitSha(" 0123456789abcdef ")).toBe("0123456789ab");
    expect(shortCommitSha("abc")).toBe("abc");
    expect(shortCommitSha("  ")).toBeUndefined();
    expect(shortCommitSha(undefined)).toBeUndefined();
  });
});

describe("web links", () => {
  const github = {
    webUrl: "https://github.com/o/r//",
    provider: "github" as const,
    commitSha: " a1 ",
  };
  const gitlab = {
    ...github,
    webUrl: "https://gitlab.com/g/r",
    provider: "gitlab" as const,
  };

  test("commit links for GitHub and GitLab only", () => {
    expect(commitWebUrl(github)).toBe("https://github.com/o/r/commit/a1");
    expect(commitWebUrl(gitlab)).toBe("https://gitlab.com/g/r/-/commit/a1");
    expect(commitWebUrl({ ...github, commitSha: "a/b" })).toBe(
      "https://github.com/o/r/commit/a%2Fb",
    );
    expect(commitWebUrl({ ...github, provider: "unknown" })).toBeUndefined();
    expect(commitWebUrl({ ...github, commitSha: " " })).toBeUndefined();
    expect(
      commitWebUrl({ provider: "github", commitSha: "a" }),
    ).toBeUndefined();
    expect(
      commitWebUrl({ provider: "github", webUrl: "https://github.com/o/r" }),
    ).toBeUndefined();
    expect(commitWebUrl(undefined)).toBeUndefined();
  });

  test("source links name the revision, path and lines", () => {
    const at = { path: " src//a b.ts ", line: 3, endLine: 5 };
    expect(sourceWebUrl(github, at)).toBe(
      "https://github.com/o/r/blob/a1/src/a%20b.ts#L3-L5",
    );
    expect(sourceWebUrl(gitlab, { path: "a.ts", line: 3, endLine: 3 })).toBe(
      "https://gitlab.com/g/r/-/blob/a1/a.ts#L3",
    );
    expect(
      sourceWebUrl(
        { ...github, commitSha: " ", branch: " dev/x " },
        { path: "a.ts" },
      ),
    ).toBe("https://github.com/o/r/blob/dev%2Fx/a.ts");
    for (const line of [0, 1.5, undefined]) {
      expect(sourceWebUrl(github, { path: "a.ts", line, endLine: 9 })).toBe(
        "https://github.com/o/r/blob/a1/a.ts",
      );
    }
    expect(sourceWebUrl(github, { path: "a.ts", line: 1, endLine: 2.5 })).toBe(
      "https://github.com/o/r/blob/a1/a.ts#L1",
    );
    for (const [repository, coordinate] of [
      [undefined, at],
      [github, undefined],
      [github, { path: "  " }],
      [github, {}],
      [{ ...github, commitSha: " " }, at],
      [github, { path: "https://x/a.ts" }],
      [{ ...github, webUrl: undefined }, at],
      [{ ...github, commitSha: undefined, branch: " " }, at],
      [{ ...github, provider: "unknown" as const }, at],
    ] as const) {
      expect(sourceWebUrl(repository, coordinate)).toBeUndefined();
    }
  });

  test("coordinates format as path:line[-end]", () => {
    expect(
      formatSourceCoordinate({ path: " a.ts ", line: 2, endLine: 4 }),
    ).toBe("a.ts:2-4");
    expect(formatSourceCoordinate({ path: "a.ts", line: 1, endLine: 1 })).toBe(
      "a.ts:1",
    );
    expect(formatSourceCoordinate({ path: "a.ts", line: 0 })).toBe("a.ts");
    expect(formatSourceCoordinate({ path: "a.ts", line: 2.5 })).toBe("a.ts");
    expect(formatSourceCoordinate({ path: " " })).toBeUndefined();
    expect(formatSourceCoordinate(undefined)).toBeUndefined();
    expect(formatSourceCoordinate({})).toBeUndefined();
  });
});
