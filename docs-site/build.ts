#!/usr/bin/env bun
/**
 * Builds the Kibi documentation site (Guide + Reference) as a fully
 * self-contained static bundle for project Pages.
 *
 * Sources of truth stay in the repository: mirrored pages render the
 * canonical `docs/*.md` files at build time, so the site can never drift
 * from the docs hosted in Git. Authored pages live in `docs-site/content/`.
 *
 * Flags:
 *   --out <dir>         Output directory (default: docs-site/dist)
 *   --report-url <url>  Requirement-report link. A URL is used verbatim;
 *                       "none" hides the link. Default: ../kibi-report/
 *                       (sibling of the docs directory on project Pages).
 *   --branch <name>     Git branch used for source links (default: develop)
 *   --github <url>      Repository base URL (default: parsed from origin)
 *
 * The build fails on broken internal links: every .md link must resolve to
 * a rendered page or an existing repository file, and every same-page or
 * cross-page #anchor must match a generated heading id.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import {
  DOCS,
  type DocPage,
  type DocSection,
  sitePagePath,
} from "./catalog.js";
import { renderLlmsTxt } from "./llms.js";
import {
  type PageShell,
  escapeHtml,
  landingContent,
  layout,
  prepareMark,
} from "./theme.js";

type DocSpec = DocPage;

type RenderedPage = {
  spec: DocSpec;
  url: string; // site-root-relative, e.g. guide/welcome.html
  title: string;
  description: string;
  html: string;
  ids: Set<string>;
  headings: Array<{ id: string; text: string; depth: 2 | 3 }>;
  bodyText: string;
};

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const DEFAULT_REPORT_URL = "../kibi-report/";
const GITHUB_FALLBACK = "https://github.com/Looted/kibi";

// ---------------------------------------------------------------------------
// Flags and repository context
// ---------------------------------------------------------------------------

function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--") continue;
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = "true";
    }
  }
  return flags;
}

const flags = parseFlags(process.argv.slice(2));
const outDir = path.resolve(REPO_ROOT, flags.out ?? "docs-site/dist");
const branch = flags.branch ?? "develop";
const reportUrlFlag = flags["report-url"] ?? DEFAULT_REPORT_URL;
const reportUrl = reportUrlFlag === "none" ? null : reportUrlFlag;

function parseOriginUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("http"))
    return trimmed.replace(/\.git$/, "").replace(/\/+$/, "");
  const ssh = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  return null;
}

function detectGithubUrl(): string {
  const git = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
    cwd: REPO_ROOT,
  });
  const origin =
    git.exitCode === 0 ? parseOriginUrl(git.stdout.toString()) : null;
  return flags.github ?? origin ?? GITHUB_FALLBACK;
}

const githubUrl = detectGithubUrl();

function shortCommit(): string | null {
  const git = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], {
    cwd: REPO_ROOT,
  });
  if (git.exitCode !== 0) return null;
  const sha = git.stdout.toString().trim();
  return /^[0-9a-f]{7,40}$/.test(sha) ? sha : null;
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

type Grammar = { re: RegExp; classes: string[] };
const GRAMMARS: Record<string, Grammar> = {
  bash: {
    re: /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|#[^\n]*)/g,
    classes: ["s", "s", "c"],
  },
  json: {
    re: /("(?:[^"\\\n]|\\.)*"\s*(?=:))|("(?:[^"\\\n]|\\.)*")|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?\b)/g,
    classes: ["k", "s", "k", "n"],
  },
  ts: {
    re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|while|import|export|from|new|await|async|class|extends|type|interface|throw|try|catch|default)\b|(\b\d+(?:\.\d+)?\b)/g,
    classes: ["c", "s", "k", "n"],
  },
};

const LANG_ALIASES: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  console: "bash",
  terminal: "bash",
  tsx: "ts",
  typescript: "ts",
  js: "ts",
  javascript: "ts",
};

/** Conservative single-pass token highlighter; falls back to escaped plain text. */
function highlightCode(raw: string, lang: string): string {
  const grammar = GRAMMARS[lang];
  if (!grammar || raw.length > 20_000) return escapeHtml(raw);
  const { re, classes } = grammar;
  let out = "";
  let last = 0;
  re.lastIndex = 0;
  for (let match = re.exec(raw); match !== null; match = re.exec(raw)) {
    out += escapeHtml(raw.slice(last, match.index));
    let cls = "k";
    for (let g = 1; g < match.length; g++) {
      if (match[g] !== undefined) {
        cls = classes[g - 1] ?? "k";
        break;
      }
    }
    out += `<span class="tok-${cls}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
    if (match[0].length === 0) re.lastIndex++;
  }
  return out + escapeHtml(raw.slice(last));
}

function createMarked(): { marked: Marked; resetSlugs: () => void } {
  const marked = new Marked({ gfm: true, breaks: false });
  const slugCounts = new Map<string, number>();

  // Heading ids must be deterministic per page, so the slug dedupe counter is
  // reset before each document is rendered (the marked instance is shared).
  function resetSlugs(): void {
    slugCounts.clear();
  }

  function uniqueSlug(text: string): string {
    const base = slugify(text) || "section";
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = uniqueSlug(stripTags(inner));
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const language = (lang ?? "").trim().split(/\s+/)[0] ?? "";
        const canonical = LANG_ALIASES[language] ?? language;
        const label = language
          ? `<span class="code-lang">${escapeHtml(language)}</span>`
          : "";
        return `<figure class="code">${label}<button type="button" class="code-copy" aria-label="Copy code">Copy</button><pre><code>${highlightCode(text, canonical)}</code></pre></figure>\n`;
      },
    },
  });
  return { marked, resetSlugs };
}

type FrontMatter = { title?: string; description?: string; body: string };

function parseFrontMatter(raw: string): FrontMatter {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { body: raw };
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return {
    title: fields.title,
    description: fields.description,
    body: raw.slice(match[0].length),
  };
}

// ---------------------------------------------------------------------------
// Page assembly
// ---------------------------------------------------------------------------

const manifestBySource = new Map(DOCS.map((spec) => [spec.source, spec]));

/** Relative href from the page's directory to a site-root-relative path. */
function relativeHref(fromUrl: string, toSitePath: string): string {
  const fromDir = path.posix.dirname(fromUrl);
  return path.posix.relative(fromDir === "." ? "" : fromDir, toSitePath);
}

const { marked, resetSlugs } = createMarked();

function renderMarkdown(
  spec: DocSpec,
  raw: string,
): Omit<RenderedPage, "url" | "spec"> {
  const isAuthored = spec.source.startsWith("docs-site/content/");
  const front = isAuthored ? parseFrontMatter(raw) : { body: raw };
  let body = front.body;
  if (!isAuthored) {
    // The page header carries the title; drop the mirrored document's own h1.
    body = body.replace(/^#\s+[^\n]*\n+/, "");
  }
  const title =
    (isAuthored ? front.title : undefined) ?? spec.title ?? spec.slug;
  const description =
    (isAuthored ? front.description : undefined) ?? spec.description ?? "";

  let html: string;
  resetSlugs();
  try {
    html = marked.parse(body, { async: false }) as string;
  } catch (error) {
    throw new Error(`Failed to render ${spec.source}: ${String(error)}`);
  }
  html = decorateCallouts(
    html
      .replaceAll("<table>", '<div class="tablewrap"><table>')
      .replaceAll("</table>", "</table></div>"),
  );

  const ids = new Set<string>();
  const headings: RenderedPage["headings"] = [];
  for (const match of html.matchAll(
    /<h([234]) id="([^"]+)">([\s\S]*?)<\/h\1>/g,
  )) {
    ids.add(match[2]);
    if (match[1] === "2" || match[1] === "3") {
      headings.push({
        id: match[2],
        text: stripTags(match[3]).trim(),
        depth: match[1] === "2" ? 2 : 3,
      });
    }
  }
  const bodyText = stripTags(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  return { title, description, html, ids, headings, bodyText };
}

type LinkIssue = { page: string; href: string; reason: string };

function rewriteLinks(
  page: RenderedPage,
  pages: Map<string, RenderedPage>,
): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const sourceDir = path.posix.dirname(page.spec.source);
  const html = page.html;

  page.html = html.replace(
    /((?:href|src)=")([^"]*)(")/g,
    (_full, lead: string, href: string, tail: string) => {
      if (!href || href.startsWith("#")) return lead + href + tail;
      if (/^(https?:|mailto:|data:)/i.test(href)) return lead + href + tail;

      const [target, fragment] = (() => {
        const at = href.indexOf("#");
        return at === -1 ? [href, ""] : [href.slice(0, at), href.slice(at)];
      })();

      if (target.endsWith(".md")) {
        const resolved = path.posix.normalize(
          path.posix.join(sourceDir, target),
        );
        // Resolution order: a real manifest source, a real repository file,
        // then a manifest slug alias for authored pages (e.g. install.md).
        let spec = manifestBySource.get(resolved);
        if (!spec && !existsSync(path.join(REPO_ROOT, resolved))) {
          const alias = path.posix.basename(target).replace(/\.md$/, "");
          const aliased = DOCS.find((candidate) => candidate.slug === alias);
          if (aliased) spec = aliased;
        }
        if (spec) {
          const rendered = pages.get(sitePagePath(spec));
          if (rendered && fragment && !rendered.ids.has(fragment.slice(1))) {
            issues.push({
              page: page.spec.source,
              href,
              reason: "anchor not found on target page",
            });
          }
          return (
            lead + relativeHref(page.url, sitePagePath(spec)) + fragment + tail
          );
        }
        if (!existsSync(path.join(REPO_ROOT, resolved))) {
          issues.push({
            page: page.spec.source,
            href,
            reason: "linked markdown file does not exist",
          });
          return lead + href + tail;
        }
        return `${lead}${githubUrl}/blob/${branch}/${resolved}${fragment}${tail}`;
      }

      // Non-markdown repository assets (workflows, logos, fixtures) link to source.
      return `${lead}${githubUrl}/blob/${branch}/${path.posix.normalize(path.posix.join(sourceDir, target))}${tail}`;
    },
  );

  // Open external links in a new tab and mark them.
  page.html = page.html.replace(
    /<a href="(https?:\/\/[^"]*)"/g,
    '<a class="external" target="_blank" rel="noopener noreferrer" href="$1"',
  );

  for (const match of page.html.matchAll(/href="#([^"]+)"/g)) {
    if (!page.ids.has(match[1])) {
      issues.push({
        page: page.spec.source,
        href: `#${match[1]}`,
        reason: "anchor not found on page",
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Chrome: navigation, table of contents, pager
// ---------------------------------------------------------------------------

/** GitHub-style alerts (`> [!NOTE]`) become labeled callouts. Other quotes stay quotes. */
function decorateCallouts(html: string): string {
  return html.replace(
    /<blockquote>([\s\S]*?)<\/blockquote>/g,
    (full, inner: string) => {
      const text = stripTags(inner).trim();
      const match = text.match(/^\[!(NOTE|TIP|WARNING|CAUTION)\]\s*/);
      if (!match || !match[1]) return full;
      const kind = match[1].toLowerCase();
      const label =
        kind === "note"
          ? "Note"
          : kind === "tip"
            ? "Tip"
            : kind === "warning"
              ? "Warning"
              : "Caution";
      const body = inner
        .replace(/<p>\s*\[!(?:NOTE|TIP|WARNING|CAUTION)\]\s*/i, "<p>")
        .replace(/<p>\s*<\/p>/g, "");
      return `<aside class="callout callout-${kind}"><span class="callout-label">${label}</span>${body}</aside>`;
    },
  );
}

function buildNav(
  titles: Map<string, string>,
  active: RenderedPage | null,
): string {
  const sections: Array<{ label: string; section: DocSection }> = [
    { label: "Guide", section: "guide" },
    { label: "Reference", section: "reference" },
  ];
  const from = active ? active.url : "index.html";
  return sections
    .map(({ label, section }) => {
      const specs = DOCS.filter((spec) => spec.section === section);
      let html = `    <div class="nav-label">${label}</div>\n`;
      let currentGroup = "";
      for (const spec of specs) {
        if (spec.group !== currentGroup) {
          currentGroup = spec.group;
          html += `    <div class="nav-group">${escapeHtml(spec.group)}</div>\n`;
        }
        const url = sitePagePath(spec);
        const current = active !== null && active.spec === spec;
        html += `      <a class="nav-item" href="${relativeHref(from, url)}"${
          current ? ' aria-current="page"' : ""
        }>${escapeHtml(titles.get(url) ?? spec.slug)}</a>\n`;
      }
      return html.trimEnd();
    })
    .join("\n");
}

function buildToc(page: RenderedPage): string {
  if (!page.headings.length) return "";
  const items = page.headings
    .map(
      (h) =>
        `    <a href="#${h.id}"${h.depth === 3 ? ' class="toc-h3"' : ""}>${escapeHtml(h.text)}</a>`,
    )
    .join("\n");
  return `\n${items}\n  `;
}

function buildPager(page: RenderedPage, flat: RenderedPage[]): string {
  const index = flat.indexOf(page);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null;
  if (!prev && !next) return "";
  const side = (
    target: RenderedPage | null,
    label: string,
    dir: "prev" | "next",
  ) => {
    if (!target) return "  <span></span>";
    return `  <a class="${dir}" href="${relativeHref(page.url, target.url)}"><span class="pager-label">${label}</span><span class="pager-title">${escapeHtml(target.title)}</span></a>`;
  };
  return `<nav class="pager" aria-label="Page navigation">\n${side(prev, "Previous", "prev")}\n${side(next, "Next", "next")}\n</nav>`;
}

function buildSearchIndex(pages: RenderedPage[]): string {
  const entries = pages.map((page) => ({
    u: page.url,
    t: page.title,
    s: page.spec.section === "guide" ? "Guide" : "Reference",
    d: page.description,
    h: page.headings.map((h) => h.text),
    b: page.bodyText.slice(0, 60_000),
  }));
  return `window.KIBI_SEARCH_INDEX=${JSON.stringify(entries)};`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function readSource(spec: DocSpec): string {
  const file = path.join(REPO_ROOT, spec.source);
  if (!existsSync(file)) {
    throw new Error(`Manifest source is missing: ${spec.source}`);
  }
  return readFileSync(file, "utf8");
}

function main(): void {
  for (const spec of DOCS) readSource(spec);

  const logoRaw = readFileSync(path.join(REPO_ROOT, "assets/logo.svg"), "utf8");
  const wordmarkRaw = readFileSync(
    path.join(REPO_ROOT, "assets/wordmark.svg"),
    "utf8",
  );
  const logoSvg = prepareMark(logoRaw, "logo");
  const wordmarkSvg = prepareMark(wordmarkRaw, "wordmark");

  const pages = new Map<string, RenderedPage>();
  for (const spec of DOCS) {
    const rendered = renderMarkdown(spec, readSource(spec));
    const page: RenderedPage = { spec, url: sitePagePath(spec), ...rendered };
    pages.set(page.url, page);
  }

  const linkIssues: LinkIssue[] = [];
  for (const page of pages.values()) {
    linkIssues.push(...rewriteLinks(page, pages));
  }

  const flat = [...pages.values()];
  const titles = new Map(flat.map((page) => [page.url, page.title]));
  const searchIndexJson = buildSearchIndex(flat);
  const commit = shortCommit();

  // Landing page
  const landing: PageShell = {
    root: "",
    title: "Kibi",
    description:
      "Say what the software should do. Kibi makes your agent follow it, and prove it did.",
    section: null,
    navHtml: buildNav(titles, null),
    tocHtml: "",
    contentHtml: landingContent({
      root: "",
      reportUrl,
      wordmarkSvg,
    }),
    pagerHtml: "",
    reportUrl,
    githubUrl,
    editUrl: null,
    logoSvg,
    wordmarkSvg,
    commit,
    branch,
  };

  const written: string[] = [];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), layout(landing));
  writeFileSync(path.join(outDir, "search-index.js"), searchIndexJson);
  written.push("index.html", "search-index.js");

  for (const page of pages.values()) {
    const shell: PageShell = {
      root: "../",
      title: `${page.title} · Kibi Docs`,
      description: page.description || page.title,
      section: page.spec.section,
      navHtml: buildNav(titles, page),
      tocHtml: buildToc(page),
      contentHtml: `<div class="page-head">\n  <div class="crumbs"><span class="chip${
        page.spec.section === "reference" ? " chip-reference" : ""
      }">${page.spec.section === "guide" ? "Guide" : "Reference"}</span></div>\n  <h1>${escapeHtml(page.title)}</h1>\n${
        page.description
          ? `  <p class="page-desc">${escapeHtml(page.description)}</p>\n`
          : ""
      }</div>\n<div class="page-rail" aria-hidden="true"></div>\n<div class="prose">\n${page.html}\n</div>`,
      pagerHtml: buildPager(page, flat),
      reportUrl,
      githubUrl,
      editUrl: `${githubUrl}/blob/${branch}/${page.spec.source}`,
      logoSvg,
      wordmarkSvg,
      commit,
      branch,
    };
    const file = path.join(outDir, page.url);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, layout(shell));
    written.push(page.url);
  }

  if (linkIssues.length > 0) {
    console.error("Broken documentation links:");
    for (const issue of linkIssues) {
      console.error(`  ${issue.page}: ${issue.href} — ${issue.reason}`);
    }
    rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
  }

  writeFileSync(path.join(outDir, "llms.txt"), renderLlmsTxt(REPO_ROOT));
  written.push("llms.txt");

  const totalBytes = written.reduce(
    (sum, file) => sum + readFileSync(path.join(outDir, file)).length,
    0,
  );
  console.log(
    `Kibi docs site: ${written.length} pages, ${(totalBytes / 1024).toFixed(0)} KiB -> ${path.relative(REPO_ROOT, outDir)}`,
  );
  console.log(`Repository: ${githubUrl} (source links point at ${branch})`);
}

main();
