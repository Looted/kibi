/**
 * Presentation layer for the Kibi documentation site.
 *
 * Everything the site ships is defined here: the page shell, the CSS design
 * system, the client script (search, copy buttons, scrollspy, mobile nav),
 * and the landing page. Output must stay self-contained per docs/brand-guide.md:
 * inline styles and scripts only, platform font stacks, no network assets.
 * The one exception is the opt-in Umami analytics script in the page head,
 * emitted only when the build is given a website ID; the site works unchanged
 * when it is absent or blocked.
 *
 * Colors are the brand tokens from docs/brand-guide.md. Do not introduce
 * other hues; proven green stays reserved for complete proof.
 */

import {
  AGENT_SETUP_PROMPT,
  SITE_TAGLINE,
  UMAMI_DOMAINS,
  UMAMI_SCRIPT_SRC,
  publishedLlmsIndexHref,
} from "./catalog.js";
import { terminalDemoHtml } from "./terminal-demo.js";

// implements REQ-docs-site-root-pages
export type Section = "guide" | "reference";

// implements REQ-docs-site-root-pages
export type PageShell = {
  /** Relative prefix from this page to the site root: "" or "../". */
  root: string;
  title: string;
  description: string;
  /** Active sidebar section; null on the landing page. */
  section: Section | null;
  navHtml: string;
  tocHtml: string;
  contentHtml: string;
  pagerHtml: string;
  reportUrl: string | null;
  githubUrl: string;
  editUrl: string | null;
  logoSvg: string;
  wordmarkSvg: string;
  commit: string | null;
  branch: string;
  /** Umami website ID; null builds a page without analytics. */
  analyticsId: string | null;
};

// implements REQ-docs-site-root-pages
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip fixed dimensions from a canonical mark so CSS controls its size. */
// implements REQ-docs-site-root-pages
export function prepareMark(svg: string, variant: "logo" | "wordmark"): string {
  return svg
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(
      "<svg ",
      `<svg class="mark ${variant}" preserveAspectRatio="xMidYMid meet" `,
    );
}

function svgFavicon(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Agent harnesses Kibi ships plugins for. Named in text only: the vendors'
 * brand rules restrict use and recoloring of their logos.
 */
const HARNESSES: ReadonlyArray<{ id: string; name: string }> = [
  { id: "claude-code", name: "Claude Code" },
  { id: "codex", name: "Codex" },
  { id: "cursor", name: "Cursor" },
  { id: "opencode", name: "OpenCode" },
  { id: "zcode", name: "ZCode" },
];

/** The logo's node -> rail -> gate, drawn wide to close the landing page. */
const CLOSING_RAIL_SVG = `<svg class="closing-rail" viewBox="0 0 520 40" aria-hidden="true" fill="none">
  <line x1="24" y1="20" x2="490" y2="20" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="16" cy="20" r="11" fill="#a2d3f4"/>
  <circle cx="140" cy="20" r="4" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="264" cy="20" r="4" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="388" cy="20" r="4" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <path d="M444 9v22M458 9v22" stroke="#3e8ed6" stroke-width="2" stroke-linecap="round"/>
  <circle cx="500" cy="20" r="7" fill="#63c99a"/>
</svg>`;

// implements REQ-docs-site-root-pages
export const styles = String.raw`
:root {
  --deep: #111318;
  --carbon: #1d1e23;
  --panel: #191c22;
  --ice: #a2d3f4;
  --signal: #3e8ed6;
  --snow: #f4f8fb;
  --mist: #aab8c2;
  --rail: #34434f;
  --proven: #63c99a;
  --warning: #f2b84b;
  --contradiction: #f07178;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, "Liberation Mono", monospace;
  --topbar-h: 56px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--deep);
  color: var(--snow);
  font-family: var(--sans);
  font-size: 15.5px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
::selection { background: rgba(62, 142, 214, 0.35); }

a { color: var(--ice); text-decoration: underline; text-decoration-color: rgba(162, 211, 244, 0.35); text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--ice); }
a.external::after { content: " \2197"; font-size: 0.82em; color: var(--mist); }
a:focus-visible, button:focus-visible, input:focus-visible, summary:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
  border-radius: 4px;
}

.skip-link {
  position: absolute; left: -9999px; top: 0; z-index: 100;
  background: var(--ice); color: var(--deep); padding: 8px 14px; border-radius: 0 0 8px 0; font-weight: 600;
}
.skip-link:focus { left: 0; }

/* ---------- Top bar ---------- */
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 14px;
  height: var(--topbar-h); padding: 0 20px;
  background: var(--deep);
  border-bottom: 1px solid var(--rail);
}
.brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--snow); flex-shrink: 0; }
.brand svg.mark.logo { height: 26px; width: auto; display: block; }
.brand svg.mark.wordmark { height: 17px; width: auto; display: block; }
.brand-docs {
  font-size: 12px; letter-spacing: 0.08em; color: var(--mist);
  border: 1px solid var(--rail); border-radius: 6px; padding: 2px 7px; margin-left: 2px;
}
.topbar-nav { display: flex; align-items: center; gap: 4px; margin-left: 8px; }
.topbar-nav a {
  color: var(--mist); text-decoration: none; font-size: 13.5px;
  padding: 6px 10px; border-radius: 8px;
}
.topbar-nav a:hover { color: var(--snow); background: var(--panel); }
.topbar-nav a[aria-current="page"] { color: var(--snow); }
.topbar-spacer { flex: 1; }

.search { position: relative; }
.search input {
  width: 230px; height: 34px; padding: 0 12px 0 34px;
  background: var(--carbon); color: var(--snow);
  border: 1px solid var(--rail); border-radius: 8px;
  font: inherit; font-size: 13.5px;
}
.search input::placeholder { color: var(--mist); }
.search input:focus { border-color: var(--signal); outline: none; }
.search .search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--mist); pointer-events: none; display: flex;
}
.search kbd {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font-family: var(--mono); font-size: 10.5px; color: var(--mist);
  border: 1px solid var(--rail); border-radius: 4px; padding: 1px 5px; pointer-events: none;
}
.search-panel {
  position: absolute; right: 0; top: calc(100% + 8px);
  width: min(520px, calc(100vw - 40px)); max-height: 420px; overflow-y: auto;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: none; padding: 6px;
}
.search-panel.open { display: block; }
.search-item { display: block; padding: 9px 12px; border-radius: 8px; text-decoration: none; }
.search-item:hover, .search-item.active { background: var(--carbon); }
.search-item .s-chip {
  display: inline-block; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--mist); border: 1px solid var(--rail); border-radius: 5px; padding: 1px 6px; margin-right: 8px;
}
.search-item .s-title { color: var(--snow); font-weight: 600; font-size: 14px; }
.search-item mark { background: rgba(162, 211, 244, 0.25); color: var(--ice); border-radius: 3px; padding: 0 1px; }
.search-item .s-snip { display: block; color: var(--mist); font-size: 12.5px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-empty { color: var(--mist); font-size: 13.5px; padding: 12px; }
.search-empty code { font-family: var(--mono); color: var(--ice); }

.nav-toggle {
  display: none; background: none; border: 1px solid var(--rail); border-radius: 8px;
  color: var(--snow); width: 36px; height: 34px; cursor: pointer; align-items: center; justify-content: center;
}

/* ---------- Shell ---------- */
.shell {
  display: grid; grid-template-columns: 280px minmax(0, 1fr) 230px;
  max-width: 1500px; margin: 0 auto; width: 100%;
}
.sidebar {
  position: sticky; top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h)); overflow-y: auto;
  padding: 26px 14px 40px 20px;
  border-right: 1px solid rgba(52, 67, 79, 0.45);
  scrollbar-width: thin; scrollbar-color: var(--rail) transparent;
}
.nav-label {
  font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--mist); margin: 22px 10px 8px; font-weight: 600;
}
.nav-label:first-child { margin-top: 0; }
.nav-group {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  font-weight: 600; color: var(--mist);
  margin: 18px 10px 6px;
}
.nav-item {
  position: relative; display: block;
  padding: 6px 10px 6px 28px; margin: 1px 0;
  color: var(--mist); text-decoration: none;
  font-size: 13.8px; border-radius: 8px; line-height: 1.45;
}
.nav-item:hover { color: var(--snow); background: rgba(25, 28, 34, 0.85); }
.nav-item[aria-current="page"] { color: var(--ice); background: rgba(62, 142, 214, 0.1); }
.nav-item[aria-current="page"]::before {
  content: ""; position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 7px; height: 7px; border-radius: 50%; background: var(--ice);
}

/* ---------- Content ---------- */
.content { padding: 40px 48px 72px; min-width: 0; }
.content.wide { max-width: none; }
.prose { max-width: 820px; }
.content.wide .prose { max-width: none; }

.crumbs { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.chip {
  display: inline-block; font-size: 11px; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--ice); border: 1px solid var(--rail); background: var(--panel);
  border-radius: 6px; padding: 3px 9px; font-weight: 600;
}
.chip.chip-reference { color: var(--mist); }

.page-head h1 { margin: 0 0 6px; font-size: 30px; line-height: 1.2; letter-spacing: -0.01em; }
.page-desc { color: var(--mist); margin: 0 0 8px; font-size: 16px; max-width: 760px; }
.page-rail {
  display: flex; align-items: center; gap: 0; margin: 26px 0 30px; height: 9px;
}
.page-rail::before {
  content: ""; width: 9px; height: 9px; border-radius: 50%;
  background: var(--ice); flex-shrink: 0;
}
.page-rail::after { content: ""; flex: 1; height: 2px; background: var(--rail); margin-left: 2px; }

.prose h2, .prose h3, .prose h4, .prose h5 { position: relative; scroll-margin-top: calc(var(--topbar-h) + 16px); }
.prose h2 {
  font-size: 21px; margin: 38px 0 12px; padding-left: 16px; letter-spacing: -0.005em;
}
.prose h2::before {
  content: ""; position: absolute; left: 0; top: 4px; bottom: 4px;
  width: 3px; border-radius: 3px; background: var(--signal);
}
.prose h3 { font-size: 16.5px; margin: 28px 0 10px; }
.prose h4 { font-size: 15px; margin: 22px 0 8px; color: var(--ice); }
.prose h5 { font-size: 14px; margin: 18px 0 6px; color: var(--mist); }
.prose p { margin: 0 0 14px; }
.prose ul, .prose ol { margin: 0 0 16px; padding-left: 26px; }
.prose li { margin: 5px 0; }
.prose li::marker { color: var(--signal); }
.prose strong { color: var(--snow); }
.prose hr {
  border: none; height: 2px; background: var(--rail);
  margin: 34px 0; border-radius: 2px; position: relative; overflow: visible;
}
.prose hr::before {
  content: ""; position: absolute; left: 0; top: -3.5px;
  width: 9px; height: 9px; border-radius: 50%; background: var(--ice);
}

.hlink {
  position: absolute; left: -1.15em; top: 50%; transform: translateY(-50%);
  color: var(--mist); text-decoration: none; opacity: 0; font-size: 0.85em; padding: 2px 4px;
}
.prose h2:hover .hlink, .prose h3:hover .hlink, .prose h4:hover .hlink,
.hlink:focus-visible { opacity: 1; }

.prose code {
  font-family: var(--mono); font-size: 0.86em;
  background: rgba(62, 142, 214, 0.13); color: var(--ice);
  border-radius: 6px; padding: 2px 6px; overflow-wrap: anywhere;
}

figure.code {
  margin: 18px 0 22px; position: relative;
  background: var(--carbon); border: 1px solid var(--rail); border-radius: 12px;
}
figure.code pre {
  margin: 0; padding: 38px 18px 16px; overflow-x: auto;
  scrollbar-width: thin; scrollbar-color: var(--rail) transparent;
}
figure.code.prompt pre { white-space: pre-wrap; overflow-wrap: anywhere; }
figure.code code { font-family: var(--mono); font-size: 13.2px; line-height: 1.6; background: none; color: var(--snow); padding: 0; border-radius: 0; }
.code-lang {
  position: absolute; left: 14px; top: 9px;
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--mist);
}
.code-copy {
  position: absolute; right: 8px; top: 6px; z-index: 1;
  font: inherit; font-size: 11.5px; color: var(--mist);
  background: var(--panel); border: 1px solid var(--rail); border-radius: 7px;
  padding: 3px 10px; cursor: pointer; opacity: 0;
}
figure.code:hover .code-copy, .code-copy:focus-visible, .code-copy.copied { opacity: 1; }
.code-copy:hover { color: var(--snow); border-color: var(--signal); }
.code-copy.copied { color: var(--deep); background: var(--ice); border-color: var(--ice); font-weight: 600; }
.tok-k { color: var(--ice); }
.tok-s { color: var(--proven); }
.tok-c { color: var(--mist); font-style: italic; }
.tok-n { color: var(--warning); }

.tablewrap { overflow-x: auto; margin: 16px 0 24px; border: 1px solid var(--rail); border-radius: 10px; scrollbar-width: thin; scrollbar-color: var(--rail) transparent; }
.prose table { border-collapse: collapse; width: 100%; font-size: 13.8px; }
.prose th, .prose td { text-align: left; padding: 8px 14px; border-bottom: 1px solid rgba(52, 67, 79, 0.5); vertical-align: top; }
.prose th {
  color: var(--mist); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;
  background: var(--panel); border-bottom: 1px solid var(--rail);
  position: sticky; top: 0;
}
.prose tbody tr:last-child td { border-bottom: none; }
.prose tbody tr:nth-child(even) { background: rgba(25, 28, 34, 0.5); }

.prose blockquote {
  margin: 16px 0 20px; padding: 12px 18px;
  background: var(--panel); border-left: 3px solid var(--signal); border-radius: 0 10px 10px 0;
  color: var(--mist);
}
.prose blockquote p:last-child { margin-bottom: 0; }
.prose blockquote code { background: rgba(62, 142, 214, 0.13); }
.callout {
  margin: 16px 0 20px; padding: 12px 16px 12px 18px;
  background: var(--panel); border-left: 3px solid var(--signal); border-radius: 0 10px 10px 0;
}
.callout-label {
  display: block; margin-bottom: 6px;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  color: var(--ice);
}
.callout p { margin: 0; color: var(--mist); }
.callout p + p { margin-top: 8px; }
.callout-warning { border-left-color: var(--warning); }
.callout-warning .callout-label { color: var(--warning); }
.callout-caution { border-left-color: var(--contradiction); }
.callout-caution .callout-label { color: var(--contradiction); }
.prose img { max-width: 100%; border-radius: 10px; border: 1px solid var(--rail); }

/* ---------- Pager ---------- */
.pager { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 48px; max-width: 820px; }
.pager a {
  display: block; text-decoration: none;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 12px;
  padding: 13px 16px;
}
.pager a:hover { border-color: var(--signal); }
.pager .pager-label { font-size: 11px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--mist); display: block; margin-bottom: 3px; }
.pager .pager-title { color: var(--ice); font-weight: 600; font-size: 14.5px; }
.pager .next { text-align: right; }

/* ---------- TOC ---------- */
.toc {
  position: sticky; top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h)); overflow-y: auto;
  padding: 34px 20px 40px 6px; font-size: 13px;
  scrollbar-width: thin; scrollbar-color: var(--rail) transparent;
}
.toc-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mist); font-weight: 600; margin-bottom: 10px; }
.toc a { display: block; color: var(--mist); text-decoration: none; padding: 4px 0 4px 14px; border-left: 2px solid var(--rail); line-height: 1.45; }
.toc a.toc-h3 { padding-left: 26px; font-size: 12.5px; }
.toc a:hover { color: var(--snow); }
.toc a.active { color: var(--ice); border-left-color: var(--signal); }

/* ---------- Footer ---------- */
.footer {
  border-top: 1px solid var(--rail); margin-top: 20px;
  padding: 22px 32px; display: flex; flex-wrap: wrap; gap: 10px 24px; align-items: center; justify-content: space-between;
  color: var(--mist); font-size: 13px;
}
.footer nav { display: flex; flex-wrap: wrap; gap: 18px; align-items: baseline; }
.footer a { color: var(--mist); }
.footer a:hover { color: var(--snow); }
.footer .commit { font-family: var(--mono); font-size: 1em; }

/* ---------- Landing ---------- */
/* The landing page speaks the logo's grammar: node -> rail -> gate. */
.landing { --land-w: 1160px; }
.landing > section { margin-top: 120px; }
.landing > section.hero { margin-top: 0; }
.landing h2 { font-size: clamp(28px, 3.4vw, 40px); line-height: 1.12; margin: 0 0 18px; padding-left: 0; letter-spacing: -0.025em; font-weight: 700; max-width: 18em; }
.landing h2::before { display: none; }
.landing .lede { color: var(--mist); font-size: 17px; line-height: 1.6; max-width: 40em; margin: 0 0 36px; }

.eyebrow {
  display: inline-flex; align-items: center; gap: 10px; margin: 0 0 18px;
  font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ice);
}
.eyebrow::before {
  content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--ice); flex-shrink: 0;
}
.eyebrow::after { content: ""; width: 44px; height: 2px; background: var(--signal); border-radius: 2px; }
.eyebrow .eb-num { color: var(--mist); }
.landing .eyebrow { margin: 0 0 18px; }

/* Hero: the first screen is the gate itself. */
.hero {
  position: relative; min-height: calc(100vh - var(--topbar-h) - 64px); min-height: calc(100svh - var(--topbar-h) - 64px);
  display: flex; flex-direction: column; justify-content: center; padding: 0;
}
.hero-stage {
  position: absolute; z-index: 0; top: -64px; bottom: 0; left: calc(50% - 50vw); width: 100vw;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 14%, #000 82%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 14%, #000 82%, transparent 100%);
}
.hero-stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hero-stage::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, rgba(17, 19, 24, 0.96) 0%, rgba(17, 19, 24, 0.9) calc(50% - 120px), rgba(17, 19, 24, 0.4) calc(50% + 200px), rgba(17, 19, 24, 0) calc(50% + 320px));
}
.hero-text { position: relative; z-index: 1; max-width: 760px; padding: 0 0 40px; }
.hero-title {
  font-size: clamp(38px, 5vw, 70px); line-height: 1; letter-spacing: -0.045em;
  margin: 0; font-weight: 700; color: var(--snow); text-wrap: balance;
}
.hero-title .hero-title-2 { display: block; color: var(--ice); }
.landing .hero-sub { color: var(--mist); font-size: 19px; font-weight: 400; line-height: 1.55; max-width: 32em; margin: 28px 0 18px; }
.landing .hero-sub strong { color: var(--snow); font-weight: 600; }
.prose .hero-points { list-style: none; margin: 0 0 28px; padding: 0; display: grid; gap: 6px; }
.prose .hero-points li { margin: 0; display: flex; align-items: flex-start; gap: 10px; color: var(--snow); font-size: 15px; }
.hero-points li::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--ice); flex-shrink: 0; margin-top: 0.6em; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 0; }
.landing .hero-canon { color: var(--mist); font-size: 13.5px; max-width: 36em; margin: 0 auto 28px; }
.hero-foot {
  position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 28px;
  padding: 18px 0 22px; border-top: 1px solid rgba(52, 67, 79, 0.6); color: var(--mist); font-size: 13px;
}
.landing .hero-foot p { margin: 0; }
.btn {
  display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 600; font-size: 14.5px;
  padding: 11px 20px; border-radius: 10px; border: 1px solid transparent;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease;
}
.btn:hover { transform: translateY(-1px); }
.btn-primary { background: var(--ice); color: var(--deep); }
.btn-primary:hover { background: var(--snow); }
.btn-primary .btn-arrow { transition: transform 140ms ease; }
.btn-primary:hover .btn-arrow { transform: translateX(3px); }
.btn-ghost { border-color: var(--rail); color: var(--snow); background: rgba(17, 19, 24, 0.6); }
.btn-ghost:hover { border-color: var(--signal); color: var(--ice); }

/* One-prompt setup line: copies the same prompt as the install section. */
figure.code.hero-copy {
  margin: 22px 0 0; padding: 6px 6px 6px 14px; display: flex; align-items: center; gap: 12px; max-width: 600px;
  background: rgba(25, 28, 34, 0.9); border: 1px solid var(--rail); border-radius: 10px;
}
.hero-copy .hc-prompt { flex: 1; min-width: 0; font-family: var(--mono); font-size: 13px; color: var(--snow); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hero-copy .hc-caret { color: var(--ice); }
.hero-copy .code-copy { position: static; opacity: 1; flex-shrink: 0; }
.hero-copy pre { display: none; }

.prose .rf-legend { display: flex; flex-wrap: wrap; gap: 6px 20px; list-style: none; margin: 0; padding: 0; }
.prose .rf-legend li { margin: 0; display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 12px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dot.intent { background: var(--ice); }
.dot.proven { background: var(--proven); }
.dot.waiting { background: transparent; box-shadow: inset 0 0 0 2px var(--warning); }
.dot.contra { background: var(--contradiction); }
.landing > section.demo { margin-top: 56px; }

/* Animated terminal: one scene per Kibi use case, replayed by the client script. */
.kd-section { margin-top: 0; }
.landing h2.kd-title {
  max-width: none; font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--mist); font-weight: 500; margin: 0 0 14px;
}
.kd {
  background: var(--panel); border: 1px solid var(--rail); border-radius: 14px; overflow: hidden; min-width: 0;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.8);
}
.kd-bar { display: flex; align-items: center; gap: 6px; padding: 9px 12px; border-bottom: 1px solid var(--rail); background: var(--carbon); flex-wrap: wrap; }
.kd-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rail); }
.kd-tabs { margin-left: auto; display: flex; gap: 2px; flex-wrap: wrap; }
.kd-tab { font: 600 12px var(--sans); color: var(--mist); background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 3px 9px; cursor: pointer; transition: color 120ms ease, border-color 120ms ease; }
.kd-tab:hover { color: var(--snow); }
.kd-tab[aria-pressed="true"] { color: var(--ice); border-color: var(--rail); background: var(--panel); }
.kd-tab:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
.kd-screen { font-family: var(--mono); font-size: 14.5px; line-height: 1.6; padding: 18px 22px; height: calc((var(--kd-rows) + 1) * 1.6em + 36px); overflow: hidden; white-space: pre-wrap; word-break: break-word; }
.kd-ln { display: block; min-height: 1.6em; }
.landing .kd-note { color: var(--mist); font-size: 12.5px; margin: 10px 0 0; }
.kd-you, .kd-info { color: var(--ice); }
.kd-tool, .kd-dim { color: var(--mist); }
.kd-name { color: var(--signal); font-weight: 600; }
.kd-ok { color: var(--proven); }
.kd-bad { color: var(--contradiction); }
.kd-warn { color: var(--warning); }
.kd-caret { display: inline-block; width: 0.55em; height: 1.05em; vertical-align: -0.16em; background: var(--ice); animation: kd-blink 1s steps(1) infinite; }
@keyframes kd-blink { 50% { opacity: 0; } }
@media (max-width: 560px) { .kd-screen { font-size: 11.5px; padding: 12px 14px; height: calc((var(--kd-rows) * 2 - 2) * 1.6em + 24px); } }
@media (prefers-reduced-motion: reduce) { .kd-caret { animation: none; } }

/* Harness logo row */
.landing > section.harnesses { margin-top: 0; padding: 26px 0 0; text-align: center; }
.landing .harnesses > p { margin: 0 0 16px; font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mist); }
.prose .harness-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 40px; }
.prose .harness-list li { margin: 0; }
.harness-list a {
  display: inline-flex; align-items: center; gap: 10px; text-decoration: none;
  color: var(--mist); font-weight: 600; font-size: 17px; letter-spacing: -0.01em;
  transition: color 160ms ease;
}
.harness-list a:hover { color: var(--ice); }
.harness-list li:not(.harness-more) a::before { content: ""; width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--signal); flex-shrink: 0; }
.harness-list .harness-more a { font-family: var(--mono); font-weight: 400; font-size: 13px; letter-spacing: 0; }

/* Problem and payoff: what changes for the developer */
.landing > section.payoff { margin-top: 96px; }
.landing .payoff h2 { max-width: 22em; }
.prose .payoffs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.prose .payoffs li {
  margin: 0; position: relative; overflow: hidden;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 14px; padding: 26px 26px 22px;
  transition: border-color 160ms ease;
}
.prose .payoffs li:hover { border-color: var(--signal); }
.po-num { display: block; font-family: var(--mono); font-size: 12px; color: var(--mist); margin-bottom: 8px; }
.payoffs h3 { margin: 0 0 18px; font-size: 21px; line-height: 1.25; color: var(--snow); letter-spacing: -0.015em; }
.po-row { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 14px; padding: 12px 0; border-top: 1px solid var(--rail); }
.po-row span { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.05em; text-transform: uppercase; padding-top: 3px; }
.landing .po-row p { margin: 0; font-size: 14.5px; line-height: 1.55; }
.po-without span { color: var(--mist); }
.landing .po-without p { color: var(--mist); }
.po-with span { color: var(--ice); }
.landing .po-with p { color: var(--snow); }

/* Intent vs code: the same five lines, with and without their reasons */
.ix { border: 1px solid var(--rail); border-radius: 14px; overflow: hidden; background: var(--panel); margin: 0 0 48px; }
.ix-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; background: var(--carbon); border-bottom: 1px solid var(--rail); }
.ix-file { font-family: var(--mono); font-size: 12.5px; color: var(--mist); }
.ix-toggle { display: inline-flex; padding: 3px; gap: 3px; border: 1px solid var(--rail); border-radius: 9px; background: var(--deep); }
.ix-btn { font: 600 12.5px var(--sans); color: var(--mist); background: transparent; border: none; border-radius: 6px; padding: 5px 11px; cursor: pointer; transition: color 140ms ease, background-color 140ms ease; }
.ix-btn:hover { color: var(--snow); }
.ix-btn[aria-pressed="true"] { color: var(--deep); background: var(--ice); }
.ix-btn:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
.ix-row { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); border-top: 1px solid rgba(52, 67, 79, 0.6); }
.ix-row:first-child { border-top: none; }
.prose .ix-code { margin: 0; padding: 14px 20px; background: none; border: none; border-left: 3px solid transparent; white-space: pre; overflow-x: auto; transition: border-color 400ms ease; }
.prose .ix-code code { font-family: var(--mono); font-size: 13px; line-height: 1.6; color: var(--snow); background: none; padding: 0; }
.tk-k { color: var(--signal); }
.tk-n { color: var(--ice); }
.ix-note { padding: 12px 20px; border-left: 1px solid rgba(52, 67, 79, 0.6); transition: opacity 400ms ease, transform 400ms ease; }
.ix-tag { display: inline-block; font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; border-radius: 5px; padding: 1px 7px; margin: 0 8px 4px 0; border: 1px solid var(--rail); color: var(--mist); }
.ix-req { font-family: var(--mono); font-size: 12px; color: var(--ice); }
.landing .ix-note p { margin: 2px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--snow); }
.ix-firm .ix-tag { color: var(--deep); background: var(--ice); border-color: var(--ice); }
.ix-default .ix-tag { color: var(--signal); border-color: var(--signal); }
.ix-exploratory .ix-tag { border-style: dashed; }
.ix-untraced .ix-tag { color: var(--warning); border-color: var(--warning); }
.ix[data-view="intent"] .ix-firm .ix-code { border-left-color: var(--ice); }
.ix[data-view="intent"] .ix-default .ix-code { border-left-color: var(--signal); }
.ix[data-view="intent"] .ix-exploratory .ix-code { border-left-color: var(--mist); }
.ix[data-view="intent"] .ix-untraced .ix-code { border-left-color: var(--warning); }
.ix[data-view="code"] .ix-note { opacity: 0; transform: translateX(-8px); }
.ix-foot { margin: 0; padding: 12px 20px; border-top: 1px solid var(--rail); background: var(--carbon); font-size: 13.5px; color: var(--mist); }
.ix[data-view="intent"] .ix-foot-code, .ix[data-view="code"] .ix-foot-intent { display: none; }
.ix[data-view="code"] .ix-foot-code { color: var(--warning); }

/* Memory vs Kibi comparison */
.vs-table { border: 1px solid var(--rail); border-radius: 14px; overflow: hidden; background: var(--panel); }
.vs-row { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.35fr); }
.vs-row + .vs-row { border-top: 1px solid var(--rail); }
.vs-row > div { padding: 16px 22px; font-size: 14.5px; line-height: 1.55; }
.vs-k { color: var(--snow); font-weight: 600; }
.vs-mem { color: var(--mist); }
.vs-kibi { color: var(--snow); background: rgba(62, 142, 214, 0.07); border-left: 1px solid var(--rail); }
.vs-head > div { padding-top: 14px; padding-bottom: 14px; font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
.vs-head .vs-mem { color: var(--mist); }
.vs-head .vs-kibi { color: var(--ice); }
.vs-kibi { position: relative; }
.vs-row:not(.vs-head) .vs-kibi { padding-left: 40px; }
.vs-row:not(.vs-head) .vs-kibi::before { content: ""; position: absolute; left: 20px; top: 24px; width: 8px; height: 8px; border-radius: 50%; background: var(--ice); }

/* Flow: the proof rail as a five-stage diagram that draws itself */
.prose .flow {
  list-style: none; margin: 8px 0 0; padding: 0; position: relative;
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0 24px;
  --node: 22px;
}
.flow::before, .flow::after {
  content: ""; position: absolute; left: calc(var(--node) / 2); right: calc(10% - var(--node) / 2); top: calc(var(--node) / 2 - 1px);
  height: 2px; border-radius: 2px;
}
.flow::before { background: var(--rail); }
.flow::after { background: var(--signal); transform-origin: left; transform: scaleX(1); transition: transform 1600ms cubic-bezier(0.6, 0, 0.2, 1); }
.reveal-ready .flow:not(.in)::after { transform: scaleX(0); }
.prose .flow li { margin: 0; position: relative; padding-top: calc(var(--node) + 26px); }
.flow .fnode {
  position: absolute; top: 0; left: 0; width: var(--node); height: var(--node); border-radius: 50%;
  background: var(--deep); border: 2px solid var(--signal);
  transition: background-color 300ms ease, border-color 300ms ease, transform 300ms ease;
}
.flow li:first-child .fnode { background: var(--ice); border-color: var(--ice); }
.flow li:last-child .fnode { background: var(--proven); border-color: var(--proven); }
.flow li:nth-child(1) .fnode { transition-delay: 0ms; }
.flow li:nth-child(2) .fnode { transition-delay: 350ms; }
.flow li:nth-child(3) .fnode { transition-delay: 700ms; }
.flow li:nth-child(4) .fnode { transition-delay: 1050ms; }
.flow li:nth-child(5) .fnode { transition-delay: 1500ms; }
.reveal-ready .flow:not(.in) .fnode { background: var(--deep); border-color: var(--rail); transform: scale(0.7); }
.flow .fgate {
  position: absolute; top: -6px; left: -22px; width: 10px; height: calc(var(--node) + 12px);
  border-left: 2px solid var(--signal); border-right: 2px solid var(--signal);
}
.flow .fstage { display: block; font-family: var(--mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mist); margin-bottom: 6px; }
.flow h3 { margin: 0 0 8px; font-size: 17px; color: var(--snow); }
.flow p { margin: 0; color: var(--mist); font-size: 14.5px; }
.flow li:last-child h3 { color: var(--proven); }

/* Steps with small product sketches */
.prose .steps {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px;
}
.prose .steps li {
  margin: 0; display: flex; flex-direction: column;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 14px; overflow: hidden;
  transition: border-color 160ms ease, transform 160ms ease;
}
.prose .steps li:hover { border-color: var(--signal); transform: translateY(-2px); }
.step-art {
  height: 190px; padding: 20px; border-bottom: 1px solid var(--rail);
  background-color: var(--carbon);
  background-image: linear-gradient(rgba(52, 67, 79, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 67, 79, 0.35) 1px, transparent 1px);
  background-size: 22px 22px; background-position: -1px -1px;
  display: flex; flex-direction: column; justify-content: center; gap: 10px;
  font-family: var(--mono); font-size: 12.5px; line-height: 1.5;
}
.step-body { padding: 22px 22px 24px; }
.step-num { display: block; font-family: var(--mono); font-size: 12px; color: var(--mist); margin-bottom: 8px; }
.steps h3 { margin: 0 0 8px; font-size: 18px; color: var(--snow); }
.steps p { margin: 0; color: var(--mist); font-size: 14.5px; }
.sk-bubble { align-self: flex-start; max-width: 92%; background: var(--deep); border: 1px solid var(--rail); border-radius: 10px 10px 10px 3px; padding: 10px 12px; color: var(--ice); }
.sk-bubble.sk-agent { align-self: flex-end; color: var(--mist); border-radius: 10px 10px 3px 10px; }
.sk-card { background: var(--deep); border: 1px solid var(--rail); border-radius: 10px; padding: 12px; }
.sk-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--mist); }
.sk-row + .sk-row { margin-top: 6px; }
.sk-id { color: var(--ice); }
.sk-btns { display: flex; gap: 8px; margin-top: 12px; }
.sk-btn { font-family: var(--sans); font-size: 12px; font-weight: 600; border-radius: 7px; padding: 4px 10px; border: 1px solid var(--rail); color: var(--snow); }
.sk-btn.sk-yes { background: var(--ice); border-color: var(--ice); color: var(--deep); }
.sk-label { display: inline-flex; align-items: center; gap: 8px; color: var(--snow); }
.sk-label .dot { width: 8px; height: 8px; }
.dot.tested { background: var(--proven); opacity: 0.7; }
.dot.asserted { background: transparent; box-shadow: inset 0 0 0 2px var(--ice); }
.dot.unverified { background: transparent; box-shadow: inset 0 0 0 2px var(--mist); opacity: 0.8; }
.sk-meter { display: flex; gap: 3px; }
.sk-meter i { width: 14px; height: 6px; border-radius: 2px; background: var(--rail); }

.prose > details { margin: 16px 0 22px; padding: 10px 16px; border: 1px solid var(--rail); border-radius: 10px; }
.prose > details > summary { cursor: pointer; font-weight: 600; color: var(--snow); }
.prose > details[open] > summary { margin-bottom: 8px; }

/* FAQ */
.faq-wrap { display: grid; grid-template-columns: minmax(0, 320px) minmax(0, 1fr); gap: 32px 64px; align-items: start; }
.faq-side { position: sticky; top: calc(var(--topbar-h) + 32px); }
.landing .faq-side p:not(.eyebrow) { color: var(--mist); font-size: 14.5px; margin: 0; }
.faq { max-width: none; border-top: 1px solid var(--rail); counter-reset: faq; }
.faq details { border-bottom: 1px solid var(--rail); padding: 0; counter-increment: faq; }
.faq summary {
  cursor: pointer; font-weight: 600; color: var(--snow); list-style: none; font-size: 16px;
  display: grid; grid-template-columns: 44px minmax(0, 1fr) 20px; align-items: center; gap: 8px;
  padding: 18px 0;
}
.faq summary::before { content: counter(faq, decimal-leading-zero); font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--mist); }
.faq summary::after {
  content: "+"; justify-self: end; font-family: var(--mono); font-weight: 400; font-size: 18px; color: var(--signal);
  transition: transform 160ms ease;
}
.faq details[open] summary::after { transform: rotate(45deg); }
.faq summary:hover { color: var(--ice); }
.faq summary::-webkit-details-marker { display: none; }
.faq details p { margin: 0 0 16px 52px; color: var(--mist); }

.pm-tablist { display: flex; flex-wrap: wrap; gap: 4px; }
.pm-tab {
  font: inherit; font-size: 13px; font-weight: 600; color: var(--mist);
  background: transparent; border: 1px solid transparent; border-bottom: none;
  border-radius: 8px 8px 0 0; padding: 7px 12px; cursor: pointer;
}
.pm-tab[aria-selected="true"] { color: var(--snow); background: var(--carbon); border-color: var(--rail); }
.pm-tabs figure.code { margin-top: 0; border-radius: 0 12px 12px 12px; }

/* Paths */
.path-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.path-card {
  position: relative; display: block; text-decoration: none; overflow: hidden;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 14px;
  padding: 28px 28px 26px; transition: border-color 160ms ease, transform 160ms ease;
}
.path-card::after {
  content: ""; position: absolute; left: 28px; right: 28px; bottom: 0; height: 2px;
  background: var(--signal); transform: scaleX(0); transform-origin: left; transition: transform 320ms ease;
}
.path-card:hover { border-color: var(--signal); transform: translateY(-2px); }
.path-card:hover::after { transform: scaleX(1); }
.path-card h3 { margin: 14px 0 8px; font-size: 21px; color: var(--snow); letter-spacing: -0.01em; }
.path-card p { color: var(--mist); margin: 0 0 16px; font-size: 14.5px; }
.path-card ul { margin: 0; padding: 0; list-style: none; }
.path-card li { padding: 4px 0 4px 18px; position: relative; color: var(--ice); font-size: 13.8px; }
.path-card li::before {
  content: ""; position: absolute; left: 0; top: 12px; width: 10px; height: 2px;
  background: var(--signal); border-radius: 2px;
}
.path-card .path-more { display: inline-block; margin-top: 16px; font-size: 13.5px; font-weight: 600; }

/* Install */
.install-cmd { margin: 16px 0 10px; }
.pm-tabs .install-cmd { margin: 0 0 16px; }
.landing .install-grid { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: 32px 56px; align-items: start; }
.landing .install-copy p { margin: 0 0 16px; color: var(--mist); }
.landing .install .fineprint { margin: 16px 0 0; }
.fineprint { color: var(--mist); font-size: 13.5px; }
.fineprint code { font-family: var(--mono); color: var(--ice); font-size: 12.5px; }

/* Self-report band and closing call to action */
.report-strip {
  position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 24px 40px;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 16px;
  padding: 34px 36px; overflow: hidden;
}
.report-strip::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--proven);
}
.landing .report-strip h2 { margin: 0 0 8px; font-size: 24px; max-width: none; }
.landing .report-strip p { margin: 0; color: var(--mist); font-size: 14.5px; max-width: 620px; }
.report-strip .report-note { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; }

.landing > section.closing { margin-top: 140px; text-align: center; padding: 0 0 40px; }
.closing .closing-rail { display: block; width: min(520px, 100%); height: auto; margin: 0 auto 36px; }
.landing .closing h2 { margin: 0 auto 14px; font-size: clamp(34px, 5vw, 60px); letter-spacing: -0.035em; max-width: 14em; }
.landing .closing p { color: var(--mist); font-size: 17px; margin: 0 auto 28px; max-width: 34em; }
.closing .hero-actions { justify-content: center; }

/* Scroll reveal (enabled by the client script; content is visible without it) */
.reveal-ready .reveal { opacity: 0; transform: translateY(18px); transition: opacity 700ms ease, transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1); }
.reveal-ready .reveal.in { opacity: 1; transform: none; }
.reveal-ready .reveal-d1 { transition-delay: 90ms; }
.reveal-ready .reveal-d2 { transition-delay: 180ms; }

@media (max-width: 979px) {
  .landing > section { margin-top: 88px; }
  .landing .install-grid, .faq-wrap, .report-strip { grid-template-columns: minmax(0, 1fr); }
  .faq-side { position: static; }
  .prose .payoffs { grid-template-columns: minmax(0, 1fr); }
  .ix-row { grid-template-columns: minmax(0, 1fr); }
  .ix-note { border-left: none; padding-top: 0; }
  .ix[data-view="code"] .ix-note { display: none; }
  .vs-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .vs-row .vs-k { grid-column: 1 / -1; padding-bottom: 0; }
  .vs-head > div:first-child { display: none; }
  .prose .flow { grid-template-columns: minmax(0, 1fr); gap: 30px; padding-left: 0; }
  .flow::before, .flow::after { left: calc(var(--node) / 2 - 1px); right: auto; top: 6px; bottom: 30px; width: 2px; height: auto; }
  .flow::after { transform-origin: top; }
  .reveal-ready .flow:not(.in)::after { transform: scaleY(0); }
  .prose .flow li { padding: 0 0 0 calc(var(--node) + 22px); }
  .flow .fgate { top: -18px; left: -4px; width: calc(var(--node) + 8px); height: 10px; border: none; border-top: 2px solid var(--signal); border-bottom: 2px solid var(--signal); }
  .hero { min-height: 0; }
  .hero-stage { top: -48px; }
  .hero-stage::after { background: rgba(17, 19, 24, 0.78); }
}
@media (max-width: 560px) {
  .hero-title { letter-spacing: -0.035em; }
  .landing .hero-sub { font-size: 17px; }
  .hero-copy .hc-prompt { font-size: 12px; }
  .faq summary { grid-template-columns: 34px minmax(0, 1fr) 18px; font-size: 15px; }
  .faq details p { margin-left: 0; }
  .report-strip { padding: 26px 24px; }
  .po-row { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .vs-row > div { padding: 12px 14px; font-size: 13.5px; }
  .vs-row:not(.vs-head) .vs-kibi { padding-left: 14px; }
  .vs-row:not(.vs-head) .vs-kibi::before { display: none; }
}

/* ---------- Responsive ---------- */
.backdrop {
  position: fixed; inset: var(--topbar-h) 0 0 0; z-index: 30;
  background: rgba(9, 11, 14, 0.6); border: none; padding: 0;
}
@media (max-width: 1279px) { .shell { grid-template-columns: 280px minmax(0, 1fr); } .toc { display: none; } }
@media (max-width: 979px) {
  .shell { grid-template-columns: minmax(0, 1fr); }
  .sidebar {
    position: fixed; left: 0; top: var(--topbar-h); z-index: 35; width: 300px;
    background: var(--deep); border-right: 1px solid var(--rail);
    transform: translateX(-102%); transition: transform 160ms ease;
  }
  body.nav-open .sidebar { transform: translateX(0); }
  .nav-toggle { display: inline-flex; }
  .brand svg.mark.wordmark { display: none; }
  .topbar-nav { display: none; }
  .search, .search input { width: 100%; max-width: none; }
  .search kbd { display: none; }
  .topbar { gap: 10px; padding: 0 14px; }
  .search { flex: 1; }
  .content { padding: 28px 20px 56px; }
  .pager { grid-template-columns: 1fr; }
  .path-grid, .prose .steps { grid-template-columns: 1fr; }
  .footer { padding: 18px 20px; }
}
@media (max-width: 560px) {
  .brand svg.mark.logo { height: 22px; }
  .brand-docs { display: none; }
}
.page-home { position: relative; overflow-x: clip; }
.page-home::before {
  content: "";
  position: absolute; z-index: 0; pointer-events: none;
  top: 0; left: 0; right: 0; height: 1100px;
  background-image:
    linear-gradient(rgba(52, 67, 79, 0.32) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 67, 79, 0.32) 1px, transparent 1px);
  background-size: 64px 64px;
  background-position: center -1px;
  -webkit-mask-image: radial-gradient(1100px 760px at 50% 0%, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 80%);
  mask-image: radial-gradient(1100px 760px at 50% 0%, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 80%);
}
.page-home::after {
  content: "";
  position: absolute; z-index: 0; pointer-events: none;
  top: 0; left: 0; right: 0; height: 700px;
  background: radial-gradient(900px 520px at 78% -12%, rgba(62, 142, 214, 0.18), transparent 70%);
}
.page-home .topbar {
  background: rgba(17, 19, 24, 0.82);
  -webkit-backdrop-filter: saturate(140%) blur(10px);
  backdrop-filter: saturate(140%) blur(10px);
  border-bottom-color: rgba(52, 67, 79, 0.55);
}
.page-home .shell { display: block; position: relative; z-index: 1; max-width: 1160px; }
.page-home .footer { position: relative; z-index: 1; }
.page-home .nav-toggle { display: none; }
.page-home .content { padding-top: 64px; }
@media (max-width: 979px) { .page-home .content { padding-top: 48px; } }

/* ---------- Preferences ---------- */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}

@media print {
  :root { --deep: #ffffff; --carbon: #f5f6f8; --panel: #eef1f4; --snow: #12161c; --mist: #4a5560; --rail: #c3ccd4; --ice: #1d5f9e; --signal: #2568a8; }
  body { background: #fff; color: #12161c; }
  .page-home::before, .page-home::after, .hero-stage { display: none; }
  .reveal { opacity: 1 !important; transform: none !important; }
  .topbar, .sidebar, .toc, .search, .nav-toggle, .code-copy, .backdrop, .pager, .hlink { display: none !important; }
  .shell { display: block; max-width: none; }
  .content { padding: 0; }
  figure.code, .tablewrap, .prose blockquote { border-color: #c3ccd4; background: #f5f6f8; }
  figure.code code { color: #12161c; }
  .prose code { background: #eef1f4; color: #1d5f9e; }
  a { color: #1d5f9e; }
}
`;

// implements REQ-docs-site-root-pages
export const clientScript = String.raw`
(function () {
  "use strict";
  var cfg = window.KIBI_DOCS || { root: "" };
  var root = cfg.root || "";

  /* ----- Analytics (no-op when Umami is blocked or absent) ----- */
  function track(name, data) {
    var u = window.umami;
    if (u && typeof u.track === "function") {
      try { u.track(name, data); } catch (err) { /* never break the page */ }
    }
  }

  /* ----- Mobile navigation ----- */
  var toggle = document.querySelector(".nav-toggle");
  var backdrop = document.querySelector(".backdrop");
  function closeNav() {
    document.body.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.hidden = true;
  }
  if (toggle && backdrop) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      backdrop.hidden = !open;
    });
    backdrop.addEventListener("click", closeNav);
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ----- Animated terminal (landing page) ----- */
  var demo = document.querySelector("[data-terminal-demo]");
  var demoData = document.getElementById("kd-scenes");
  if (demo && demoData) {
    var scenes = JSON.parse(demoData.textContent || "{}");
    var screen = demo.querySelector(".kd-screen");
    var tabs = demo.querySelectorAll(".kd-tab");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var run = 0;
    var line = function (runs) {
      var el = document.createElement("span");
      el.className = "kd-ln";
      runs.forEach(function (r) {
        var part = document.createElement("span");
        part.className = "kd-" + r[0];
        part.textContent = r[1];
        el.appendChild(part);
      });
      screen.appendChild(el);
      return el;
    };
    var wait = function (ms, id) {
      return new Promise(function (done) { setTimeout(function () { done(id === run); }, ms); });
    };
    var play = async function (index) {
      var id = ++run;
      tabs.forEach(function (t, j) { t.setAttribute("aria-pressed", String(index === j)); });
      screen.textContent = "";
      var lines = scenes.scenes[index].lines;
      if (reduce) { lines.forEach(function (l) { line(l.runs); }); return; }
      var caret = document.createElement("span");
      caret.className = "kd-caret";
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        if (l.typed) {
          var text = l.runs[0][1];
          var el = line([[l.runs[0][0], text.slice(0, 2)]]);
          var target = el.firstChild;
          el.appendChild(caret);
          for (var c = 2; c < text.length; c++) {
            if (!(await wait(24 + Math.random() * 28, id))) return;
            target.textContent += text[c];
          }
          if (!(await wait(250, id))) return;
          caret.remove();
        } else {
          line(l.runs);
        }
        if (!(await wait(l.pauseMs, id))) return;
      }
      if (await wait(scenes.hold, id)) play((index + 1) % scenes.scenes.length);
    };
    tabs.forEach(function (t, j) {
      t.addEventListener("click", function () {
        track("terminal-scene", { scene: t.textContent });
        play(j);
      });
    });
    play(0);
  }

  /* ----- Scroll reveal (landing page) ----- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal, .flow");
  if (reveals.length && "IntersectionObserver" in window && !reduceMotion) {
    document.body.classList.add("reveal-ready");
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    for (var r = 0; r < reveals.length; r++) revealer.observe(reveals[r]);
  }

  /* ----- Intent vs code toggle (landing page) ----- */
  var ix = document.querySelector("[data-intent-demo]");
  if (ix) {
    var ixButtons = ix.querySelectorAll("[data-ix-view]");
    var setView = function (view) {
      ix.setAttribute("data-view", view);
      ixButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-ix-view") === view)); });
    };
    var ixTouched = false;
    ixButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        ixTouched = true;
        setView(b.getAttribute("data-ix-view"));
        track("intent-toggle", { view: b.getAttribute("data-ix-view") });
      });
    });
    if ("IntersectionObserver" in window && !reduceMotion) {
      setView("code");
      var ixObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        ixObserver.disconnect();
        setTimeout(function () { if (!ixTouched) setView("intent"); }, 1800);
      }, { threshold: 0.6 });
      ixObserver.observe(ix);
    }
  }

  /* ----- Rail field (landing hero) -----
     Requirements ride rails to one gate. Most clear it on fresh evidence and
     turn proven green; some wait on evidence; a few stop on a contradiction.
     The requirement names are illustrative. */
  var field = document.querySelector("[data-railfield]");
  var fieldCanvas = field ? field.querySelector("canvas") : null;
  if (field && fieldCanvas && fieldCanvas.getContext) {
    var css = getComputedStyle(document.documentElement);
    var color = function (name, fallback) { return (css.getPropertyValue(name) || fallback).trim(); };
    var C = {
      rail: color("--rail", "#34434f"), signal: color("--signal", "#3e8ed6"), ice: color("--ice", "#a2d3f4"),
      proven: color("--proven", "#63c99a"), warning: color("--warning", "#f2b84b"),
      contra: color("--contradiction", "#f07178"), deep: color("--deep", "#111318"), mist: color("--mist", "#aab8c2"),
    };
    var MONO = css.getPropertyValue("--mono") || "monospace";
    var NAMES = [
      "session-idle-timeout", "draft-autosave", "checkout-total-positive", "upload-size-limit",
      "admin-delete-deny", "invite-expiry", "reset-token-single-use", "audit-log-retention",
      "export-csv-columns", "login-rate-limit", "role-assignment-max", "webhook-signature",
    ];
    var ctx = fieldCanvas.getContext("2d");
    var W = 0, H = 0, rails = [], gateX = 0, tokens = [], last = 0, spawnIn = 0, visible = true, frame = 0, labels = false, gateRow = 0;
    var rand = function (a, b) { return a + Math.random() * (b - a); };
    var pickOne = function (list) { return list[Math.floor(Math.random() * list.length)]; };
    var size = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = field.clientWidth; H = field.clientHeight;
      fieldCanvas.width = Math.round(W * dpr); fieldCanvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gap = 30;
      var n = Math.max(6, Math.floor((H - 40) / gap));
      var top = (H - (n - 1) * gap) / 2;
      rails = [];
      for (var i = 0; i < n; i++) rails.push({ y: Math.round(top + i * gap) + 0.5, busy: 0, label: 0 });
      labels = W >= 1100;
      gateRow = 0;
      while (gateRow < rails.length - 4 && rails[gateRow].y < H * 0.18) gateRow++;
      gateX = Math.round(labels ? Math.max(W / 2 + 330, Math.min(W * 0.74, W / 2 + 420)) : W * 0.84);
    };
    var outcome = function () {
      var x = Math.random();
      return x < 0.62 ? "pass" : x < 0.86 ? "wait" : "contra";
    };
    var labelFor = function (tk) {
      var id = "REQ-" + tk.name;
      if (tk.fate === "pass") return { text: id + "  " + (Math.random() < 0.2 ? "proved" : "tested"), color: C.proven, side: 1 };
      if (tk.fate === "wait") return { text: id + "  waiting on evidence", color: C.warning, side: -1 };
      var other = pickOne(NAMES);
      if (other === tk.name) other = NAMES[(NAMES.indexOf(other) + 1) % NAMES.length];
      return { text: id + "  contradicts " + other, color: C.contra, side: -1 };
    };
    var spawn = function (x) {
      var free = rails.filter(function (r) { return r.busy < 2; });
      if (!free.length) return null;
      var index = Math.floor(Math.random() * free.length);
      var rail = free[index];
      rail.busy++;
      var tk = { rail: rail, x: x, v: rand(80, 170), state: "run", fate: outcome(), t: 0, alpha: 1, name: pickOne(NAMES), label: null };
      tokens.push(tk);
      return tk;
    };
    var canLabel = function (rail) {
      var at = rails.indexOf(rail);
      if (at <= gateRow || at > rails.length - 3) return false;
      for (var i = Math.max(0, at - 1); i <= Math.min(rails.length - 1, at + 1); i++) if (rails[i].label) return false;
      return tokens.filter(function (t) { return t.label; }).length < 6;
    };
    var arrive = function (tk) {
      if (labels && Math.random() < 0.85 && canLabel(tk.rail)) {
        var made = labelFor(tk);
        ctx.font = "12px " + MONO;
        if (ctx.measureText(made.text).width > W - gateX - 48) return;
        tk.label = made; tk.lt = 0; tk.rail.label++; }
    };
    var drawToken = function (tk) {
      var y = tk.rail.y;
      var now = tk.state === "pass" ? C.proven : tk.state === "wait" ? C.warning : tk.state === "contra" ? C.contra : C.ice;
      var trail = Math.min(160, Math.max(0, tk.x));
      var g = ctx.createLinearGradient(tk.x - trail, 0, tk.x, 0);
      g.addColorStop(0, "rgba(62,142,214,0)");
      g.addColorStop(1, tk.state === "pass" ? C.proven : C.signal);
      ctx.globalAlpha = tk.alpha;
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tk.x - trail, y); ctx.lineTo(tk.x, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(tk.x, y, 4.5, 0, Math.PI * 2);
      if (tk.state === "wait") { ctx.fillStyle = C.deep; ctx.fill(); ctx.strokeStyle = now; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = now; ctx.fill(); }
      if (tk.label) {
        ctx.globalAlpha = Math.min(tk.alpha, Math.max(0, Math.min(1, tk.lt * 5, (3 - tk.lt) / 0.6)));
        ctx.font = "12px " + MONO;
        ctx.fillStyle = tk.label.color;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(tk.label.text, gateX + 26, y - 11);
      }
      ctx.globalAlpha = 1;
    };
    var draw = function () {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.strokeStyle = C.rail; ctx.globalAlpha = 0.8;
      for (var i = 0; i < rails.length; i++) {
        ctx.beginPath(); ctx.moveTo(0, rails[i].y); ctx.lineTo(W, rails[i].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.signal; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gateX, 0); ctx.lineTo(gateX, H); ctx.moveTo(gateX + 10, 0); ctx.lineTo(gateX + 10, H); ctx.stroke();
      if (labels) {
        ctx.font = "11px " + MONO; ctx.fillStyle = C.mist; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("GATE · FRESH EVIDENCE ONLY", gateX + 26, rails[gateRow].y - 15);
      }
      for (var k = 0; k < tokens.length; k++) drawToken(tokens[k]);
    };
    var step = function (dt) {
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(-10); spawnIn = rand(0.12, 0.34); }
      for (var i = tokens.length - 1; i >= 0; i--) {
        var tk = tokens[i];
        if (tk.label) {
          tk.lt += dt;
          if (tk.lt > 3) { tk.label = null; tk.rail.label--; }
        }
        if (tk.state === "run") {
          tk.x += tk.v * dt;
          if (tk.x >= gateX - 12) {
            if (tk.fate === "pass") { tk.state = "pass"; tk.x = gateX + 22; tk.v *= 0.8; }
            else { tk.state = tk.fate; tk.x = gateX - 12; }
            arrive(tk);
          }
        } else if (tk.state === "pass") {
          tk.x += tk.v * dt;
          if (tk.x > W + 170) tk.alpha = 0;
        } else {
          tk.t += dt;
          if (tk.t > (tk.label ? 2.4 : 1.4)) tk.alpha = Math.max(0, tk.alpha - dt * 1.4);
        }
        if (tk.alpha <= 0) {
          tk.rail.busy--;
          if (tk.label) tk.rail.label--;
          tokens.splice(i, 1);
        }
      }
    };
    var loop = function (now) {
      frame = 0;
      if (!visible || document.hidden) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      step(dt); draw();
      frame = requestAnimationFrame(loop);
    };
    var start = function () { if (!frame && !reduceMotion) { last = 0; frame = requestAnimationFrame(loop); } };
    var seed = function () {
      tokens = []; rails.forEach(function (r) { r.busy = 0; r.label = 0; });
      for (var s = 0; s < rails.length * 1.2; s++) {
        var x = rand(0.02, 1) * W;
        var tk = spawn(x);
        if (!tk || x < gateX - 12) continue;
        if (tk.fate === "pass") { tk.state = "pass"; tk.x = Math.max(x, gateX + 22); }
        else { tk.state = tk.fate; tk.x = gateX - 12; tk.t = rand(0, 1.2); }
        arrive(tk);
      }
    };
    size(); seed(); draw();
    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { size(); seed(); draw(); }, 120);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }).observe(field);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
    start();
  }

  /* ----- Copy buttons ----- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".code-copy") : null;
    if (!btn) return;
    var figure = btn.closest("figure.code");
    var code = figure ? figure.querySelector("pre code") : null;
    if (!code) return;
    var text = code.textContent || "";
    var panel = figure.getAttribute("data-pm-panel");
    if (panel) track("install-copy", { method: panel });
    else {
      var lang = figure.querySelector(".code-lang");
      track("code-copy", { lang: lang ? lang.textContent : "", page: location.pathname });
    }
    function done(ok) {
      btn.classList.add("copied");
      btn.textContent = ok ? "Copied" : "Failed";
      window.setTimeout(function () {
        btn.classList.remove("copied");
        btn.textContent = "Copy";
      }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else {
      done(fallbackCopy(text));
    }
  });
  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  /* ----- Package-manager tabs ----- */
  function selectPm(tab) {
    var root = tab.closest("[data-pm-tabs]");
    if (!root) return;
    var name = tab.getAttribute("data-pm");
    var tabs = root.querySelectorAll(".pm-tab");
    var panels = root.querySelectorAll("[data-pm-panel]");
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i] === tab;
      tabs[i].setAttribute("aria-selected", on ? "true" : "false");
      if (on) tabs[i].removeAttribute("tabindex");
      else tabs[i].setAttribute("tabindex", "-1");
    }
    for (var j = 0; j < panels.length; j++) {
      panels[j].hidden = panels[j].getAttribute("data-pm-panel") !== name;
    }
  }
  document.addEventListener("click", function (e) {
    var tab = e.target.closest ? e.target.closest(".pm-tab") : null;
    if (!tab) return;
    selectPm(tab);
    track("install-tab", { method: tab.getAttribute("data-pm") });
  });
  document.addEventListener("keydown", function (e) {
    var tab = e.target.closest ? e.target.closest(".pm-tab") : null;
    if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    var list = tab.parentElement;
    if (!list) return;
    var tabs = list.querySelectorAll(".pm-tab");
    var index = 0;
    for (var i = 0; i < tabs.length; i++) if (tabs[i] === tab) index = i;
    var next = e.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    e.preventDefault();
    selectPm(tabs[next]);
    tabs[next].focus();
  });

  /* ----- Heading anchors ----- */
  var prose = document.querySelector(".prose");
  if (prose) {
    var heads = prose.querySelectorAll("h2[id], h3[id], h4[id]");
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i];
      var a = document.createElement("a");
      a.className = "hlink";
      a.href = "#" + h.id;
      a.setAttribute("aria-label", "Link to this section");
      a.textContent = "#";
      h.insertBefore(a, h.firstChild);
    }
  }

  /* ----- Table of contents scrollspy ----- */
  var tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    for (var j = 0; j < tocLinks.length; j++) byId[tocLinks[j].getAttribute("href").slice(1)] = tocLinks[j];
    var current = null;
    var observer = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        var id = entries[k].target.id;
        if (entries[k].isIntersecting && byId[id]) {
          if (current) current.classList.remove("active");
          current = byId[id];
          current.classList.add("active");
        }
      }
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0 });
    var spy = document.querySelectorAll(".prose h2[id], .prose h3[id]");
    for (var m = 0; m < spy.length; m++) observer.observe(spy[m]);
  }

  /* ----- Search ----- */
  var index = window.KIBI_SEARCH_INDEX || [];
  var input = document.querySelector(".search input");
  var panel = document.querySelector(".search-panel");
  if (!input || !panel || !index.length) return;

  var entries = [];
  for (var n = 0; n < index.length; n++) {
    entries.push({
      u: index[n].u, t: index[n].t, tl: index[n].t.toLowerCase(), s: index[n].s, d: index[n].d,
      h: (index[n].h || []).join(" ").toLowerCase(),
      b: (index[n].b || "").toLowerCase()
    });
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function markMatch(text, needle) {
    var at = text.toLowerCase().indexOf(needle);
    if (at < 0) return esc(text);
    return esc(text.slice(0, at)) + "<mark>" + esc(text.slice(at, at + needle.length)) + "</mark>" + esc(text.slice(at + needle.length));
  }

  function runSearch(raw) {
    var q = raw.trim().toLowerCase();
    if (!q) { renderPanel([]); return; }
    var tokens = q.split(/\s+/);
    var scored = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var score = 0;
      var all = true;
      for (var t = 0; t < tokens.length; t++) {
        var tok = tokens[t];
        var s = 0;
        if (e.tl.indexOf(tok) === 0) s += 50;
        else if (e.tl.indexOf(tok) >= 0) s += 34;
        if (e.h.indexOf(tok) >= 0) s += 16;
        var hits = 0;
        var at = 0;
        while ((at = e.b.indexOf(tok, at)) >= 0 && hits < 6) { hits++; at += tok.length; }
        if (hits) s += 6 + Math.min(hits, 4);
        if (!s) { all = false; break; }
        score += s;
      }
      if (all && score > 0) scored.push({ score: score, e: e });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    renderPanel(scored.slice(0, 10).map(function (x) { return x.e; }), q);
  }

  var activeItem = -1;
  function renderPanel(items, q) {
    activeItem = -1;
    if (!items.length) {
      panel.innerHTML = q === undefined ? "" :
        '<div class="search-empty">No matches. Try a command like <code>kibi prove</code> or a word like "requirements".</div>';
      panel.classList.toggle("open", q !== undefined);
      input.setAttribute("aria-expanded", q !== undefined ? "true" : "false");
      return;
    }
    var html = "";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var snippet = it.d || "";
      if (q) {
        var at = snippet.toLowerCase().indexOf(q);
        if (at < 0 && it.b) {
          var bat = it.b.indexOf(q);
          if (bat >= 0) snippet = (bat > 40 ? "\u2026" : "") + (it.b.slice(bat, bat + 90));
        }
      }
      html += '<a class="search-item" href="' + root + it.u + '">' +
        '<span class="s-chip">' + esc(it.s) + '</span><span class="s-title">' + markMatch(it.t, q || "") + '</span>' +
        (snippet ? '<span class="s-snip">' + esc(snippet) + '</span>' : "") +
        '</a>';
    }
    panel.innerHTML = html;
    panel.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  }

  function setActive(next) {
    var items = panel.querySelectorAll(".search-item");
    if (!items.length) return;
    if (activeItem >= 0 && items[activeItem]) items[activeItem].classList.remove("active");
    activeItem = next;
    if (activeItem >= 0 && activeItem < items.length) {
      items[activeItem].classList.add("active");
      items[activeItem].scrollIntoView({ block: "nearest" });
    }
  }

  input.setAttribute("aria-expanded", "false");
  input.setAttribute("autocomplete", "off");
  input.addEventListener("input", function () { runSearch(input.value); });
  input.addEventListener("focus", function () { if (input.value) runSearch(input.value); });
  input.addEventListener("keydown", function (e) {
    var count = panel.querySelectorAll(".search-item").length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(activeItem + 1, count - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(activeItem - 1, 0)); }
    else if (e.key === "Enter") {
      var items = panel.querySelectorAll(".search-item");
      var pick = activeItem >= 0 ? items[activeItem] : items[0];
      if (pick) { window.location.href = pick.getAttribute("href"); }
    } else if (e.key === "Escape") {
      input.value = "";
      renderPanel([]);
      input.blur();
    }
  });
  document.addEventListener("click", function (e) {
    if (!panel.contains(e.target) && e.target !== input) renderPanel([]);
  });
  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
})();
`;

// implements REQ-docs-site-root-pages
export function landingContent(args: {
  root: string;
  reportUrl: string | null;
  wordmarkSvg: string;
}): string {
  const { root, reportUrl } = args;
  const methods: Array<{
    id: string;
    label: string;
    lang: string;
    copyLabel: string;
    command: string;
  }> = [
    {
      id: "agent",
      label: "Agent prompt (recommended)",
      lang: "prompt",
      copyLabel: "Copy the agent setup prompt",
      command: AGENT_SETUP_PROMPT,
    },
    {
      id: "npm",
      label: "npm",
      lang: "bash",
      copyLabel: "Copy npm install commands",
      command:
        "npm install --save-dev kibi-core kibi-cli kibi-mcp\nnpm exec -- kibi init",
    },
    {
      id: "pnpm",
      label: "pnpm",
      lang: "bash",
      copyLabel: "Copy pnpm install commands",
      command: "pnpm add -D kibi-core kibi-cli kibi-mcp\npnpm exec kibi init",
    },
    {
      id: "yarn",
      label: "Yarn",
      lang: "bash",
      copyLabel: "Copy Yarn install commands",
      command: "yarn add -D kibi-core kibi-cli kibi-mcp\nyarn exec kibi init",
    },
  ];
  const installTabs = methods
    .map((method, index) => {
      const selected = index === 0;
      return `<button type="button" class="pm-tab" role="tab" id="pm-tab-${method.id}" aria-controls="pm-panel-${method.id}" aria-selected="${selected ? "true" : "false"}"${selected ? "" : ' tabindex="-1"'} data-pm="${method.id}">${method.label}</button>`;
    })
    .join("");
  const installPanels = methods
    .map((method, index) => {
      const selected = index === 0;
      const figureClass =
        method.lang === "prompt"
          ? "code prompt install-cmd"
          : "code install-cmd";
      return `<figure class="${figureClass}" id="pm-panel-${method.id}" role="tabpanel" aria-labelledby="pm-tab-${method.id}" data-pm-panel="${method.id}"${selected ? "" : " hidden"}>
  <span class="code-lang">${method.lang}</span>
  <button type="button" class="code-copy" aria-label="${method.copyLabel}">Copy</button>
  <pre><code>${escapeHtml(method.command)}</code></pre>
</figure>`;
    })
    .join("\n");
  const reportCta = reportUrl
    ? `<a class="btn btn-ghost" href="${reportUrl}" data-umami-event="cta-click" data-umami-event-target="hero-live-report">See Kibi&rsquo;s live report</a>`
    : `<a class="btn btn-ghost" href="${root}guide/reading-the-report.html" data-umami-event="cta-click" data-umami-event-target="read-report">Read a health report</a>`;
  const reportStrip = reportUrl
    ? `<section class="report-strip reveal">
  <div>
    <h2>This repository publishes its own report</h2>
    <p>Every push to the default branch republishes requirement health for Kibi itself: how many current requirements are fully tested end to end, which ones rest only on someone's word, which ones contradict each other, and which evidence has gone stale.</p>
    <div class="report-note"><span class="dot proven"></span>Tested means fresh end-to-end evidence on the current code snapshot.</div>
  </div>
  <a class="btn btn-ghost" href="${reportUrl}" data-umami-event="cta-click" data-umami-event-target="live-report">Open the live report</a>
</section>`
    : "";
  return `<div class="prose landing">
<section class="hero">
  <div class="hero-stage" data-railfield aria-hidden="true"><canvas></canvas></div>
  <div class="hero-text">
    <p class="eyebrow">Open source &middot; runs in your repository</p>
    <h1 class="hero-title">Say what the software should do. <span class="hero-title-2">Your agent won&rsquo;t forget why.</span></h1>
    <p class="hero-sub"><strong>Kibi is a requirements framework for AI coding agents.</strong> It records the reasoning behind your code (the intent, assumptions and trade-offs you agreed in the chat) as requirements in your repository, links them to the code and tests, and makes every later agent respect them.</p>
    <ul class="hero-points">
      <li>Keeps the why behind each change, not just the what</li>
      <li>Shows the agent that reasoning before it edits the code</li>
      <li>Refuses new rules that contradict old ones</li>
      <li>Reports which requirements are actually tested</li>
    </ul>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${root}guide/quick-start.html" data-umami-event="cta-click" data-umami-event-target="install">Install Kibi <span class="btn-arrow" aria-hidden="true">&rarr;</span></a>
      ${reportCta}
    </div>
    <figure class="code hero-copy" data-pm-panel="hero">
      <span class="hc-prompt"><span class="hc-caret">&rsaquo;</span> Set up Kibi in this repository, then bootstrap its knowledge base.</span>
      <button type="button" class="code-copy" aria-label="Copy the agent setup prompt">Copy</button>
      <pre><code>${escapeHtml(AGENT_SETUP_PROMPT)}</code></pre>
    </figure>
  </div>
  <div class="hero-foot">
    <p>Each line is a requirement riding to the gate. Only fresh end-to-end evidence clears it.</p>
    <ul class="rf-legend" aria-label="Legend">
      <li><span class="dot intent"></span>intent</li>
      <li><span class="dot proven"></span>cleared the gate</li>
      <li><span class="dot waiting"></span>waiting on evidence</li>
      <li><span class="dot contra"></span>contradiction</li>
    </ul>
  </div>
</section>
<section class="harnesses" aria-label="Supported agents">
  <p>Plugins for the agents you already use</p>
  <ul class="harness-list">
    ${HARNESSES.map(
      (h) =>
        `<li><a href="${root}guide/install.html#optional-${h.id}-plugin" data-umami-event="harness-click" data-umami-event-harness="${h.id}"><span>${h.name}</span></a></li>`,
    ).join("")}
    <li class="harness-more"><a href="${root}guide/connect-an-agent.html">+ any MCP client or the CLI</a></li>
  </ul>
</section>
<section class="payoff">
  <p class="eyebrow reveal"><span class="eb-num">01</span>The problem</p>
  <h2 class="reveal">Code shows what the software does. Not what it must keep doing.</h2>
  <p class="lede reveal">In source, every line looks equally deliberate. A hard-won trade-off, a business rule, a temporary assumption, a shortcut and a forgotten leftover all read the same. The difference lived in the conversation where they were decided, and that conversation is gone. So the next agent either &ldquo;cleans up&rdquo; a decision or carefully preserves an accident.</p>
  <div class="ix reveal" data-intent-demo data-view="intent">
    <div class="ix-bar">
      <span class="ix-file">billing.ts</span>
      <div class="ix-toggle" role="group" aria-label="View">
        <button type="button" class="ix-btn" data-ix-view="code" aria-pressed="false">What the agent sees</button>
        <button type="button" class="ix-btn" data-ix-view="intent" aria-pressed="true">What you decided</button>
      </div>
    </div>
    <div class="ix-body">
      <div class="ix-row ix-firm">
        <pre class="ix-code"><code><span class="tk-k">export const</span> TRIAL_DAYS = <span class="tk-n">14</span>;</code></pre>
        <div class="ix-note"><span class="ix-tag">firm: ask before changing</span><span class="ix-req">REQ-trial-length</span><p>A trade-off: shorter trials convert better, and we accept more churn.</p></div>
      </div>
      <div class="ix-row ix-firm">
        <pre class="ix-code"><code><span class="tk-k">export function</span> canCheckout(cart) {
  <span class="tk-k">return</span> cart.total &gt; <span class="tk-n">0</span>;
}</code></pre>
        <div class="ix-note"><span class="ix-tag">firm: ask before changing</span><span class="ix-req">REQ-checkout-total-positive</span><p>A business rule: never charge for an empty cart.</p></div>
      </div>
      <div class="ix-row ix-exploratory">
        <pre class="ix-code"><code><span class="tk-k">export const</span> MAX_SEATS = <span class="tk-n">50</span>;</code></pre>
        <div class="ix-note"><span class="ix-tag">exploratory</span><span class="ix-req">REQ-seat-cap</span><p>An assumption: holds until enterprise pricing exists. Revisit when this area is touched.</p></div>
      </div>
      <div class="ix-row ix-default">
        <pre class="ix-code"><code><span class="tk-k">export function</span> chargeWithRetry(order) {
  <span class="tk-k">return</span> retry(() =&gt; charge(order), { attempts: <span class="tk-n">5</span> });
}</code></pre>
        <div class="ix-note"><span class="ix-tag">default</span><span class="ix-req">REQ-payment-retry</span><p>A shortcut: the payment provider drops webhooks. A later agent may rework it with evidence.</p></div>
      </div>
      <div class="ix-row ix-untraced">
        <pre class="ix-code"><code><span class="tk-k">export function</span> legacyDiscount(user) {
  <span class="tk-k">return</span> user.createdAt &lt; CUTOFF ? <span class="tk-n">0.1</span> : <span class="tk-n">0</span>;
}</code></pre>
        <div class="ix-note"><span class="ix-tag">no requirement owns this</span><p>Nobody recorded why. Kibi asks the agent to write down what it does before changing it.</p></div>
      </div>
    </div>
    <p class="ix-foot"><span class="ix-foot-code">Five pieces of code. Without the reasons, any of them could be a decision or a mistake.</span><span class="ix-foot-intent">With Kibi, the reasons are written down, linked to the code, and shown to the agent before it edits these lines.</span></p>
  </div>
  <ul class="payoffs">
    <li class="reveal">
      <span class="po-num">01</span>
      <h3>The why outlives the chat</h3>
      <div class="po-row po-without"><span>Without</span><p>The chat said &ldquo;we&rsquo;ll do X to retain users&rdquo;. The code only says X, and the next agent cannot tell a trade-off from a mistake.</p></div>
      <div class="po-row po-with"><span>With Kibi</span><p>Each requirement records why it exists, and decisions keep their trade-offs. They live in <code>.kb/</code> beside the code on every branch, and Kibi flags requirements that do not say why.</p></div>
    </li>
    <li class="reveal reveal-d1">
      <span class="po-num">02</span>
      <h3>Decisions stop getting undone</h3>
      <div class="po-row po-without"><span>Without</span><p>The agent rewrites a rule it never knew existed.</p></div>
      <div class="po-row po-with"><span>With Kibi</span><p>Before it edits a file, the agent is shown the requirement that code implements, what it must keep true, and the decision behind it.</p></div>
    </li>
    <li class="reveal">
      <span class="po-num">03</span>
      <h3>Conflicts are caught before the code</h3>
      <div class="po-row po-without"><span>Without</span><p>Two prompts a week apart contradict each other, and nobody notices.</p></div>
      <div class="po-row po-with"><span>With Kibi</span><p>A rule that contradicts an existing one is refused with both named, and you decide which wins.</p></div>
    </li>
    <li class="reveal reveal-d1">
      <span class="po-num">04</span>
      <h3>&ldquo;Done&rdquo; means tested, not claimed</h3>
      <div class="po-row po-without"><span>Without</span><p>Green CI does not say which product behavior still works on this commit.</p></div>
      <div class="po-row po-with"><span>With Kibi</span><p>The health report shows which requirements have fresh end-to-end evidence, which rest only on someone&rsquo;s word, and which have gaps.</p></div>
    </li>
  </ul>
</section>
<section class="vs">
  <p class="eyebrow reveal"><span class="eb-num">02</span>Why not a memory file</p>
  <h2 class="reveal">Memory remembers. Kibi enforces.</h2>
  <p class="lede reveal">Notes files and memory servers help an agent recall things. Kibi turns intent and its reasons into rules that are linked to code, checked for contradictions, put in front of the agent at edit time, and backed by evidence.</p>
  <div class="vs-table reveal" role="table" aria-label="Project memory compared with Kibi">
    <div class="vs-row vs-head" role="row"><div role="columnheader"></div><div class="vs-mem" role="columnheader">Project memory</div><div class="vs-kibi" role="columnheader">Kibi</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">The why behind the code</div><div class="vs-mem" role="cell">Sometimes, somewhere in prose.</div><div class="vs-kibi" role="cell">Every requirement records why it exists and decisions keep their trade-offs. A requirement that does not say why is flagged.</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">What it holds</div><div class="vs-mem" role="cell">Free-text notes the agent wrote or you pasted.</div><div class="vs-kibi" role="cell">Typed requirements, scenarios and facts, linked to the functions that implement them and the tests that check them.</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">When the agent sees it</div><div class="vs-mem" role="cell">When it remembers to look, if the note fits in context.</div><div class="vs-kibi" role="cell">Automatically, before it edits code a requirement owns. Hooks put the rule in front of the agent.</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">Two rules that conflict</div><div class="vs-mem" role="cell">Both are kept. Whichever the agent reads last wins.</div><div class="vs-kibi" role="cell">The new rule is refused, checked against typed facts, not text similarity, with both rules named.</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">Changing a decision</div><div class="vs-mem" role="cell">Anyone can overwrite a note, silently.</div><div class="vs-kibi" role="cell">A firm decision changes only with your words, and every replacement records why.</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">Code with no rule</div><div class="vs-mem" role="cell">Invisible.</div><div class="vs-kibi" role="cell">A changed function that no requirement owns is flagged, so the agent records what it does.</div></div>
    <div class="vs-row" role="row"><div class="vs-k" role="rowheader">Is it still true?</div><div class="vs-mem" role="cell">Unknown.</div><div class="vs-kibi" role="cell">Each requirement is labeled proved, tested, asserted or unverified from fresh evidence on this commit.</div></div>
  </div>
</section>
<section class="demo">
  ${terminalDemoHtml()}
</section>
<section>
  <p class="eyebrow reveal"><span class="eb-num">03</span>How it works</p>
  <h2 class="reveal">From prompt to proof, on one rail</h2>
  <p class="lede reveal">Kibi keeps intent attached to the work at every stage, and it is conservative about the last one.</p>
  <ol class="flow reveal">
    <li><span class="fnode"></span><span class="fstage">Intent</span><h3>You say it once</h3><p>Prompt the behavior in plain words, the way you already do. That sentence stays the source.</p></li>
    <li><span class="fnode"></span><span class="fstage">Requirements</span><h3>The agent writes it down</h3><p>Requirements, scenarios and typed facts land in <code>.kb/</code> beside the code, citing the ticket or page they came from.</p></li>
    <li><span class="fnode"></span><span class="fstage">Enforcement</span><h3>Every edit hears it</h3><p>Hooks name the requirement before an agent edits the code that implements it. Checks flag contradictions and untraced code.</p></li>
    <li><span class="fnode"></span><span class="fstage">Evidence</span><h3>Tests leave receipts</h3><p>A test that claims a requirement records evidence tied to the exact code snapshot it ran on.</p></li>
    <li><span class="fgate" aria-hidden="true"></span><span class="fnode"></span><span class="fstage">Proof</span><h3>Only fresh evidence passes</h3><p>Stale receipts and passing unit tests do not clear the gate. Proved is reserved for claims a checker established for every case.</p></li>
  </ol>
</section>
<section>
  <p class="eyebrow reveal"><span class="eb-num">04</span>Your part</p>
  <h2 class="reveal">What you actually do</h2>
  <p class="lede reveal">Three things, and none of them is filling in a requirements form.</p>
  <ol class="steps">
    <li class="reveal">
      <div class="step-art" aria-hidden="true">
        <div class="sk-bubble">&rsaquo; Draft edits must save when someone navigates away.</div>
        <div class="sk-bubble sk-agent">Proposing a plan for REQ-draft-autosave&hellip;</div>
      </div>
      <div class="step-body">
        <span class="step-num">01</span>
        <h3>State the behavior</h3>
        <p>Prompt the way you already do. &ldquo;Draft edits must save when someone navigates away.&rdquo; You do not fill in a requirements form.</p>
      </div>
    </li>
    <li class="reveal reveal-d1">
      <div class="step-art" aria-hidden="true">
        <div class="sk-card">
          <div class="sk-row"><span>plan</span><span class="sk-id">REQ-draft-autosave</span></div>
          <div class="sk-row"><span>+ requirement &middot; scenario &middot; fact</span><span>firm</span></div>
          <div class="sk-btns"><span class="sk-btn sk-yes">Approve</span><span class="sk-btn">Correct</span></div>
        </div>
      </div>
      <div class="step-body">
        <span class="step-num">02</span>
        <h3>Approve real decisions</h3>
        <p>The agent proposes a plan before it writes project knowledge. You approve it, or you correct the product call. A plan compiled from your prompt lands in full or not at all, and the bookkeeping stays with the agent.</p>
      </div>
    </li>
    <li class="reveal reveal-d2">
      <div class="step-art" aria-hidden="true">
        <div class="sk-card">
          <div class="sk-row"><span class="sk-label"><span class="dot proven"></span>proved</span><span>checker, every case</span></div>
          <div class="sk-row"><span class="sk-label"><span class="dot tested"></span>tested</span><span>fresh end-to-end</span></div>
          <div class="sk-row"><span class="sk-label"><span class="dot asserted"></span>asserted</span><span>a person stands behind it</span></div>
          <div class="sk-row"><span class="sk-label"><span class="dot unverified"></span>unverified</span><span>only an agent does</span></div>
        </div>
      </div>
      <div class="step-body">
        <span class="step-num">03</span>
        <h3>Read the result</h3>
        <p>The health report names what is tested, what still has a gap, and what contradicts itself, and labels each requirement proved, tested, asserted or unverified. A green test run is a different fact.</p>
      </div>
    </li>
  </ol>
</section>
<section class="install" id="install">
  <p class="eyebrow reveal"><span class="eb-num">05</span>Setup</p>
  <h2 class="reveal">Add Kibi to the repository</h2>
  <div class="install-grid">
    <div class="install-copy reveal">
      <p>Kibi is driven by your coding agent, so the recommended setup is a prompt. Your agent installs the packages, runs <code>kibi init</code>, connects itself to Kibi, and bootstraps the knowledge base behind a plan you approve, then adds scenarios, predicates and the claims the plan could not write in the normal workflow, and proposes how proof runs for your test runner in a second plan you approve. The package-manager tabs are the manual route; re-running <code>kibi init</code> completes missing directories and schema files while preserving existing knowledge and schema files. It does not invent what the product does.</p>
      <p>The agent first asks where your product intent lives, such as issue trackers, wikis and specs, and which sources to trust. Every requirement in the bootstrap plan cites the ticket or page it came from, and nothing is written until you approve the plan. When a claim sits next to an existing requirement on the same topic that Kibi cannot check logically, the plan names that requirement so the agent compares the two, including for claims the plan leaves for the agent to write. How plans are built, applied and resumed after an interruption is in the <a href="${root}reference/mcp.html#kb_plan_bootstrap">MCP reference</a>.</p>
    </div>
    <div class="reveal reveal-d1">
  <div class="pm-tabs" data-pm-tabs>
    <div class="pm-tablist" role="tablist" aria-label="Setup method">${installTabs}</div>
    ${installPanels}
  </div>
  <p class="fineprint">Requires Node.js 22+. SWI-Prolog is bundled on Linux (x64, arm64) and macOS; other platforms need <code>swipl</code> (SWI-Prolog 9.0+) on your <code>PATH</code>. A system <code>swipl</code> is only a fallback; set <code>KIBI_SWIPL=system</code> to prefer it. Bun commands and per-platform setup are in the <a href="${root}guide/install.html">installation guide</a>. Each release has one version, such as Kibi 2026.11.0, that names its exact package set; <code>kibi --version</code> and <code>kibi doctor</code> show it (<a href="${root}guide/install.html#kibi-release-versions">release versions</a>), and the CLI tells you once a day when a newer one is out (<a href="${root}guide/install.html#update-notices">update notices</a>). Kibi sends anonymous usage statistics; <a href="${root}guide/telemetry.html">see what is sent and how to turn it off</a>.</p>
    </div>
  </div>
</section>
<section class="paths">
  <p class="eyebrow reveal"><span class="eb-num">06</span>Docs</p>
  <h2 class="reveal">Where to go next</h2>
  <div class="path-grid">
    <a class="path-card reveal" href="${root}guide/welcome.html">
      <span class="chip">Guide</span>
      <h3>Use Kibi on a repository</h3>
      <p>Install it, connect the agent you already use, and learn how to read the first health report. Written for the person prompting, not for the agent.</p>
      <ul>
        <li>What is Kibi?</li>
        <li>Quick start</li>
        <li>Connect your coding agent</li>
        <li>Read the health report</li>
        <li>Read the KBs of repositories you depend on</li>
      </ul>
      <span class="path-more">Start the guide &rarr;</span>
    </a>
    <a class="path-card reveal reveal-d1" href="${root}reference/cli.html">
      <span class="chip chip-reference">Reference</span>
      <h3>Look up the exact contract</h3>
      <p>Commands, tool schemas, entity fields, and the checks Kibi actually runs. Dry on purpose, and rendered from the same files as the repository.</p>
      <ul>
        <li>CLI reference</li>
        <li>MCP tools</li>
        <li>Entity schema</li>
        <li>Error reference</li>
      </ul>
      <span class="path-more">Open the reference &rarr;</span>
    </a>
  </div>
</section>
<section>
  <div class="faq-wrap">
    <div class="faq-side">
      <p class="eyebrow"><span class="eb-num">07</span>FAQ</p>
      <h2>Questions people ask first</h2>
      <p>The short answers. The <a href="${root}guide/welcome.html">guide</a> has the long ones.</p>
    </div>
    <div class="faq">
    <details>
      <summary>Do I write the requirements myself?</summary>
      <p>No. You describe the behavior. Your agent turns that into requirements, scenarios, tests, and links to the code. You step in when the product decision is actually ambiguous.</p>
    </details>
    <details>
      <summary>Does this replace my issue tracker?</summary>
      <p>No. Keep the tracker you have. During bootstrap the agent asks which trackers, wikis, and specs hold your product intent, reads them through its own connectors, and cites the ticket or page behind each requirement. Kibi then connects that decision to the code that implements it, and to evidence that the code still does it.</p>
    </details>
    <details>
      <summary>Which languages does Kibi understand?</summary>
      <p>TypeScript and JavaScript work out of the box. Add the optional <code>kibi-plugin-treesitter</code> package for Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, SWI-Prolog, and Terraform/HCL. It runs offline with pinned grammars, and each language is a small <code>kibi-lang-*</code> pack you install only if you use it. Generated files don't count toward a pack or need requirement links unless the KB uses them, and you can decline any pack. Code and source proofs read TypeScript, JavaScript, Python and SWI-Prolog directly, and through the plugin, source proofs read the imports, calls and environment reads of Go, Java, C#, Rust, PHP, C and Bash files, and the property values of PHP, C and Terraform/HCL files, without compiling them. Setup is in the <a href="${root}reference/plugins.html">plugin reference</a>.</p>
    </details>
    <details>
      <summary>Can Kibi stop agents drifting from our UI design?</summary>
      <p>Partly, and only if you opt in. The experimental <code>kibi-plugin-ui</code> package, which <code>/kibi-bootstrap</code> offers when it finds React or Angular components, makes <code>kb_check</code> require every component to implement a design requirement, and flags a component that loses the class names or test ids that mark its agreed pattern. That catches an agent rewriting a timeline as cards. It cannot see pixels, colours or spacing; those stay with your linter. Details are in the <a href="${root}reference/plugins.html#optional-ui-design-plugin">plugin reference</a>.</p>
    </details>
    <details>
      <summary>Can my agent ask Kibi what governs a change?</summary>
      <p>Yes. <code>kb_search</code> accepts a plain question and, alongside ranked matches, returns the current requirements that govern the topic with their linked facts, scenarios, tests, and ADRs (with an excerpt of each decision). For each requirement it also reports any contradiction or infeasible-scenario finding that names it, the approved exceptions that exempt it, and what the checks could not decide, and it names the branch and KB snapshot the answer came from. On a new branch whose store was never compiled, the answer says so and points at <code>kibi sync</code> instead of returning a silent empty result. Superseded and retired requirements are listed separately so they are not read as current policy, and a top match that no requirement owns is named as such rather than dressed in lower-ranked requirements. No finding is not proof: full consistency and proof status still come from <code>kb_check</code>, which also says which rules it evaluated and how many fact pairs it compared, and <code>kb_coverage</code>. The answer is ten rows by default, and on Claude Code it is sent once, as structured content with a short text summary rather than a second JSON copy in the text.</p>
    </details>
    <details>
      <summary>Can my agent ask a precise question instead of searching?</summary>
      <p>Yes. <code>kb_query</code> asks the modeled facts directly, without the agent writing Prolog: <code>{predicate: "permission_rule", where: {actor: "admin"}}</code> returns each rule with its allow or deny effect, <code>{predicate: "has_role", where: {user: "alice"}, distinct: "role"}</code> counts a user's roles, and <code>{subjectKey: "user.role_assignment", propertyKey: "max_roles"}</code> returns a limit with its operator and value. <code>{factKind: "predicate_schema"}</code> lists the predicates and argument names the project models, an unknown argument name comes back with the declared ones, an empty answer lists the values that do exist, and every answer names the next call to make. The facts that <code>kb_search</code> links to a requirement carry the same typed claim and the query that asks about it, and <code>{id, includeBody: true}</code> returns a requirement's authored body so a stale sentence in it can be corrected.</p>
    </details>
    <details>
      <summary>Can my agent check a rule before writing it?</summary>
      <p>Yes. <code>kb_upsert</code> with <code>dryRun: true</code> runs the validation a real write runs, including the contradiction check for a requirement, and with <code>plannedFacts</code> it stages the facts <code>kb_model</code> planned, so an allow rule that would contradict a stored deny on the same actor, action and resource is refused before either is written, with the conflict named. <code>kb_model</code> also returns such a grounding as a hash-bound plan: its contradiction analysis is computed over the current knowledge base, a conflict leaves the plan blocked, and a clean plan writes the fact and its link in one <code>kb_apply_plan</code> call, all or nothing. <code>kb_delete</code> also takes <code>dryRun: true</code>, and deleting an authored entity first returns a hash-bound plan with the exact <code>kb_apply_plan</code> call that applies it.</p>
    </details>
    <details>
      <summary>What happens when an agent edits code a requirement owns?</summary>
      <p>With the Claude Code, Cursor, Codex, ZCode, or OpenCode plugin, the pre-edit hook (OpenCode: the edit prompt) names the requirement the file implements, what it must keep true (from its linked facts), and the decision behind it (its ADR), before the change is made. With the Claude Code plugin this also covers edits the agent makes through shell commands, which get the same context right after the command runs. A superseded or retired requirement is not shown as current. Afterwards <code>kb_check</code>, scoped to the changed files, names any changed function in a file no requirement owns, so the agent records what it now does without being asked; it quotes the statement and firmness of each requirement the changed code implements, and opens with "no structural violations" rather than "no violations", because it never compares code with a requirement's prose; for a file with no linked symbols, both the hook and the check name the requirements whose titles share the file's path words, so "nothing linked" is not read as "no rule applies"; and reports conflicts it can decide, such as an allow and a deny for the same actor, action and resource, and says when an analysis is incomplete instead of calling it clean. A scenario that assumes something a current requirement forbids, on its own or only in combination with its other assumptions, is flagged and blocks proof. Conditional requirements count: "checkout may happen only when the cart total is positive" becomes a typed rule, and a checkout scenario with a zero total is flagged unless a human approved an exception for it.</p>
    </details>
    <details>
      <summary>Does Kibi work on a CI checkout or a detached commit?</summary>
      <p>For reading, yes. On a commit no single branch points at, such as a CI checkout of a SHA or a bisect, search, query, status, check, coverage, and graph answer from a read-only snapshot compiled from that checkout, and every answer says so. Writes are refused until you check out a branch or set <code>KIBI_BRANCH</code>. Details are in the <a href="${root}reference/cli.html#kibi-branch">CLI reference</a>.</p>
    </details>
    <details>
      <summary>How do I tell what the agent wrote from what I approved?</summary>
      <p>Each entity can record its origin: written by a human, an agent, a migration or an import, and who approved it. New entities from your agent are marked as agent-written. <code>kb_check</code> lists agent-written requirements nobody has approved, exceptions whose approval only the agent recorded, and requirements that do not say why they exist. Kibi cannot confirm that a person approved something. It shows you what still needs your review.</p>
      <p>Requirements and ADRs also record how firmly they were decided. A rule you stated is <code>firm</code> and points at your words; only another firm decision can replace it, so the agent is told to ask you first, and the agent cannot reword it in place unless it cites your new words. Kibi checks that the reference is there, not that you really wrote it. A choice you delegated, or one the agent made, is <code>default</code>: a later agent may replace it when it has evidence, and every replacement must say why it changed. A guess is <code>exploratory</code>. A rule with no firmness counts as <code>firm</code> unless the agent wrote it, and bootstrap marks the rules it imports from your documents as <code>firm</code>. When your request conflicts with any recorded rule, the agent names the rule and asks before changing it. Search results and the edit hooks show which is which.</p>
    </details>
    <details>
      <summary>What counts as tested, and what as proved?</summary>
      <p>A requirement is tested only when a test that claims to verify it has fresh end-to-end evidence for the current code. A passing unit test, a coverage percentage, or an old receipt does not count. The one exception is a requirement that only names a UI pattern, such as "this list is a line-and-dots timeline in both views": an isolated component test with a fresh receipt covers it, because rendering the component shows everything the requirement says. Freshness is computed from repository-relative paths and file contents, so CI and your own checkout of the same commit agree on what is tested. Tests sample cases, so tested is not proved: Kibi reserves proved for a claim a checker established for every case, with a certificate a second program can re-check. Certificate proof kinds cover enumerated domains, type-level checks, arithmetic and solver constraints, rules, state machines (including states that can never be reached and states every path must pass through), patterns, and the project's own routes, database schemas, configuration and code references, which Kibi reads itself. A requirement no current test checks is asserted when a person stands behind it and unverified when only an agent does.</p>
    </details>
    <details>
      <summary>Will Kibi decide the product for me?</summary>
      <p>No. <code>kibi init</code> creates the directory and the Git hooks; it leaves hooks it did not write alone, and with lefthook, husky or the pre-commit framework it installs none and prints the configuration to add (<code>kibi init --print-hook all --format lefthook</code>). It also tells agents in a fresh clone about Kibi through <code>AGENTS.md</code>, installs the hooks again from the <code>package.json</code> <code>prepare</code> script, and compiles a clone's store on its first query. What it commits is what you and the agent authored: symbol line positions are derived by every sync into a gitignored cache, so parallel branches do not conflict over them. It does not infer behavior. Checks prove what was encoded. Missing knowledge stays visible.</p>
    </details>
    </div>
  </div>
</section>
${reportStrip}
<section class="closing reveal">
  ${CLOSING_RAIL_SVG}
  <h2>Start with one prompt.</h2>
  <p>Paste the setup prompt into your agent, approve the plan it shows you, and read your first health report.</p>
  <p class="hero-canon">${escapeHtml(SITE_TAGLINE)}</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="#install" data-umami-event="cta-click" data-umami-event-target="closing-install">Get the setup prompt <span class="btn-arrow" aria-hidden="true">&rarr;</span></a>
    <a class="btn btn-ghost" href="${root}guide/welcome.html" data-umami-event="cta-click" data-umami-event-target="closing-guide">Read the guide</a>
  </div>
</section>
</div>`;
}

// implements REQ-docs-site-root-pages
export function layout(page: PageShell): string {
  const {
    root,
    title,
    description,
    section,
    navHtml,
    tocHtml,
    contentHtml,
    pagerHtml,
    reportUrl,
    githubUrl,
    editUrl,
    logoSvg,
    wordmarkSvg,
    commit,
    branch,
    analyticsId,
  } = page;
  const favicon = svgFavicon(logoSvg);
  // The report URL is relative to the site root (e.g. "kibi-report/"):
  // every page prepends its own root prefix; absolute URLs pass through.
  const reportHref = reportUrl
    ? reportUrl.startsWith("http")
      ? reportUrl
      : `${root}${reportUrl}`
    : null;

  const topbarNav = `<nav class="topbar-nav" aria-label="Primary">
  <a href="${root}guide/welcome.html"${section === "guide" ? ' aria-current="page"' : ""}>Guide</a>
  <a href="${root}reference/cli.html"${section === "reference" ? ' aria-current="page"' : ""}>Reference</a>
  ${reportHref ? `<a href="${reportHref}">Report</a>` : ""}
  <a class="external" href="${githubUrl}" target="_blank" rel="noopener noreferrer" data-umami-event="github-click" data-umami-event-location="topbar">GitHub</a>
</nav>`;

  const tocBlock = tocHtml
    ? `<aside class="toc" aria-label="On this page"><div class="toc-label">On this page</div>${tocHtml}</aside>`
    : "";

  const editLink = editUrl
    ? `<a class="external" href="${editUrl}" target="_blank" rel="noopener noreferrer">Edit this page</a>`
    : "";
  const commitLink = commit
    ? `<a class="commit external" href="${githubUrl}/tree/${commit}" target="_blank" rel="noopener noreferrer">${commit}</a>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#111318">
<link rel="alternate" type="text/plain" href="${root}llms.txt" title="Documentation index for language models">
<meta name="llms-txt" content="${publishedLlmsIndexHref()}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="icon" href="${favicon}">
${analyticsId ? `<script defer src="${UMAMI_SCRIPT_SRC}" data-website-id="${analyticsId}" data-domains="${UMAMI_DOMAINS}" data-do-not-track="true" data-performance="true"></script>\n` : ""}<style>${styles}</style>
</head>
<body${section === null ? ' class="page-home"' : ""}>
<a class="skip-link" href="#main">Skip to content</a>
<header class="topbar">
  <button type="button" class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="sidebar">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
  </button>
  <a class="brand" href="${root}index.html" aria-label="Kibi documentation home">
    ${logoSvg}
    ${wordmarkSvg}
    <span class="brand-docs">Docs</span>
  </a>
  ${topbarNav}
  <div class="topbar-spacer"></div>
  <div class="search">
    <span class="search-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4.4" stroke="currentColor" stroke-width="1.5"/><path d="m9.4 9.4 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
    <input type="search" placeholder="Search the docs" aria-label="Search the documentation" aria-expanded="false" aria-controls="search-panel">
    <kbd>/</kbd>
    <div class="search-panel" id="search-panel" role="listbox" aria-label="Search results"></div>
  </div>
</header>
<button type="button" class="backdrop" hidden aria-label="Close navigation" tabindex="-1"></button>
<div class="shell">
${
  section === null
    ? ""
    : `<nav class="sidebar" id="sidebar" aria-label="Documentation">${navHtml}</nav>`
}
<main id="main" class="content${section === null ? " wide" : ""}">
${contentHtml}
${pagerHtml}
</main>
${tocBlock}
</div>
<footer class="footer">
  <span>Kibi documentation &mdash; built from the repository <code style="font-family:var(--mono)">docs/</code> sources.${analyticsId ? " Visits are counted with cookieless Umami analytics." : ""} ${editLink}</span>
  <nav aria-label="Footer">
    <a class="external" href="${githubUrl}" target="_blank" rel="noopener noreferrer" data-umami-event="github-click" data-umami-event-location="footer">GitHub</a>
    ${reportHref ? `<a href="${reportHref}">Requirement health</a>` : ""}
    <a class="external" href="${githubUrl}/blob/${branch}/LICENSE.md" target="_blank" rel="noopener noreferrer">AGPL-3.0</a>
    ${commitLink}
  </nav>
</footer>
<script>window.KIBI_DOCS={root:${JSON.stringify(root)}};</script>
<script src="${root}search-index.js"></script>
<script>${clientScript}</script>
</body>
</html>
`;
}
