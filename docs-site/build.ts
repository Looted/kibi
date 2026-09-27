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
  type PageShell,
  type Section,
  escapeHtml,
  landingContent,
  layout,
  prepareMark,
} from "./theme.js";

type DocSpec = {
  slug: string;
  section: Section;
  title?: string;
  description?: string;
  /** Repository-root-relative path of the markdown source. */
  source: string;
};

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
// Manifest: the site's navigation and page order. Title/description for
// authored pages come from front matter; mirrored docs are described here.
// ---------------------------------------------------------------------------

const DOCS: DocSpec[] = [
  // Guide — human-oriented narrative, how-to, and explanation.
  { slug: "welcome", section: "guide", source: "docs-site/content/welcome.md" },
  {
    slug: "quick-start",
    section: "guide",
    source: "docs-site/content/quick-start.md",
  },
  {
    slug: "install",
    section: "guide",
    title: "Installation",
    description:
      "Install the Kibi packages with your package manager and set up the SWI-Prolog prerequisite.",
    source: "docs/install.md",
  },
  {
    slug: "connect-an-agent",
    section: "guide",
    source: "docs-site/content/connect-an-agent.md",
  },
  {
    slug: "how-it-works",
    section: "guide",
    source: "docs-site/content/how-it-works.md",
  },
  {
    slug: "proof-ladder",
    section: "guide",
    title: "The proof ladder",
    description:
      "From a stated requirement to fresh end-to-end evidence: the stages a requirement climbs to count as proven.",
    source: "docs/proof-ladder.md",
  },
  {
    slug: "modeling",
    section: "guide",
    title: "Modeling requirements",
    description:
      "A practical cheat sheet for turning product intent into requirements, scenarios, tests, facts, and code links.",
    source: "docs/modeling-cheatsheet.md",
  },
  {
    slug: "github-integration",
    section: "guide",
    title: "Publish requirement health",
    description:
      "Publish the requirement-health report and badge on GitHub Pages so proof status is visible on every pull request.",
    source: "docs/github-integration.md",
  },
  {
    slug: "troubleshooting",
    section: "guide",
    title: "Troubleshooting",
    description:
      "Recovery procedures for setup problems and broken Kibi state.",
    source: "docs/troubleshooting.md",
  },
  // Reference — precise, complete, technical.
  {
    slug: "cli",
    section: "reference",
    title: "CLI reference",
    description:
      "Every kibi CLI command, flag, and dedicated JSON operation route, command by command.",
    source: "docs/cli-reference.md",
  },
  {
    slug: "mcp",
    section: "reference",
    title: "MCP tools",
    description:
      "The canonical MCP tool catalog, onboarding contract, and schemas exposed by the Kibi MCP server.",
    source: "docs/mcp-reference.md",
  },
  {
    slug: "entity-schema",
    section: "reference",
    title: "Entity schema",
    description:
      "The eight entity types, their fields, and every typed relationship the knowledge graph supports.",
    source: "docs/entity-schema.md",
  },
  {
    slug: "inference-rules",
    section: "reference",
    title: "Inference rules",
    description:
      "The deterministic validation, contradiction, and coherence rules Kibi enforces.",
    source: "docs/inference-rules.md",
  },
  {
    slug: "proving",
    section: "reference",
    title: "Proving requirements",
    description:
      "Proof contracts, the kibi prove workflow, and the kibi.proof-run.v1 producer artifact contract.",
    source: "docs/proving-requirements.md",
  },
  {
    slug: "errors",
    section: "reference",
    title: "Error reference",
    description: "Every MCP error code, its meaning, and the recovery path.",
    source: "docs/error-reference.md",
  },
  {
    slug: "architecture",
    section: "reference",
    title: "Architecture",
    description:
      "Storage layout, branch isolation, and the data flow between the CLI, MCP server, and Prolog engine.",
    source: "docs/architecture.md",
  },
  {
    slug: "symbol-taxonomy",
    section: "reference",
    title: "Symbol traceability taxonomy",
    description:
      "How code symbols are classified and linked to requirements, and what counts as sufficient traceability.",
    source: "docs/symbol-traceability-taxonomy.md",
  },
  {
    slug: "plugins",
    section: "reference",
    title: "Plugin development",
    description:
      "Extend Kibi with capability plugins: the SDK, manifests, and plugin lifecycle.",
    source: "docs/plugin-development.md",
  },
  {
    slug: "agent-onboarding",
    section: "reference",
    title: "Agent onboarding",
    description:
      "The copy-paste discovery snippet that lets any coding agent find and use Kibi's interfaces.",
    source: "docs/generic-agent-onboarding.md",
  },
];

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

function pageUrl(spec: DocSpec): string {
  return `${spec.section}/${spec.slug}.html`;
}

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
  html = html
    .replaceAll("<table>", '<div class="tablewrap"><table>')
    .replaceAll("</table>", "</table></div>");

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
          const rendered = pages.get(pageUrl(spec));
          if (rendered && fragment && !rendered.ids.has(fragment.slice(1))) {
            issues.push({
              page: page.spec.source,
              href,
              reason: "anchor not found on target page",
            });
          }
          return lead + relativeHref(page.url, pageUrl(spec)) + fragment + tail;
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

function buildNav(
  titles: Map<string, string>,
  active: RenderedPage | null,
): string {
  const groups: Array<{ label: string; section: Section }> = [
    { label: "Guide", section: "guide" },
    { label: "Reference", section: "reference" },
  ];
  const from = active ? active.url : "index.html";
  return groups
    .map(({ label, section }) => {
      const items = DOCS.filter((spec) => spec.section === section)
        .map((spec) => {
          const url = pageUrl(spec);
          const current = active !== null && active.spec === spec;
          return `      <a class="nav-item" href="${relativeHref(from, url)}"${
            current ? ' aria-current="page"' : ""
          }>${escapeHtml(titles.get(url) ?? spec.slug)}</a>`;
        })
        .join("\n");
      return `    <div class="nav-label">${label}</div>\n${items}`;
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
    const page: RenderedPage = { spec, url: pageUrl(spec), ...rendered };
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
    title: "Kibi Documentation",
    description:
      "Guides and reference for Kibi, the agent-native requirements compiler. Prompt the intent; Kibi makes the agent remember it and prove the implementation.",
    section: null,
    navHtml: buildNav(titles, null),
    tocHtml: "",
    contentHtml: landingContent({
      root: "",
      reportUrl,
      wordmarkSvg,
      installCommand:
        "npm install --save-dev kibi-core kibi-cli kibi-mcp\nnpm exec -- kibi init",
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
