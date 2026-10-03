/**
 * Presentation layer for the Kibi documentation site.
 *
 * Everything the site ships is defined here: the page shell, the CSS design
 * system, the client script (search, copy buttons, scrollspy, mobile nav),
 * and the landing page. Output must stay self-contained per docs/brand-guide.md:
 * inline styles and scripts only, platform font stacks, no network assets.
 *
 * Colors are the brand tokens from docs/brand-guide.md. Do not introduce
 * other hues; proven green stays reserved for complete proof.
 */

import {
  AGENT_SETUP_PROMPT,
  SITE_TAGLINE,
  publishedLlmsIndexHref,
} from "./catalog.js";

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

const RAIL_SVG = `<svg class="rail-svg" viewBox="0 0 760 96" role="img" aria-label="Intent travels a rail through requirements, enforcement, and evidence, then passes a gate to become proof" fill="none">
  <line x1="53" y1="40" x2="720" y2="40" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="40" cy="40" r="13" fill="#a2d3f4"/>
  <circle cx="212" cy="40" r="5" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="384" cy="40" r="5" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="556" cy="40" r="5" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <path d="M634 27v26M650 27v26" stroke="#3e8ed6" stroke-width="2" stroke-linecap="round"/>
  <circle cx="728" cy="40" r="8" fill="#63c99a"/>
  <g fill="#aab8c2" font-family="-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="13">
    <text x="40" y="80" text-anchor="middle">Intent</text>
    <text x="212" y="80" text-anchor="middle">Requirements</text>
    <text x="384" y="80" text-anchor="middle">Enforcement</text>
    <text x="556" y="80" text-anchor="middle">Evidence</text>
    <text x="728" y="80" text-anchor="middle">Proof</text>
  </g>
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
.hero { padding: 0 0 8px; }
.hero-grid { display: block; }
.hero-lower {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  gap: 36px 80px;
  align-items: start;
  margin-top: 28px;
}
.hero-mark svg.mark { width: min(280px, 72vw); height: auto; display: block; }
.hero-title {
  font-size: clamp(32px, 4vw, 48px); line-height: 1.12; letter-spacing: -0.02em;
  max-width: 18em; margin: 28px 0 0; font-weight: 700;
}
.landing .hero-sub { color: var(--mist); font-size: 19px; font-weight: 400; line-height: 1.5; max-width: 36em; margin: 0 0 20px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 0; }
.landing .hero-canon { color: var(--mist); font-size: 13.5px; max-width: 36em; margin: 20px 0 0; }
.btn {
  display: inline-block; text-decoration: none; font-weight: 600; font-size: 14.5px;
  padding: 10px 20px; border-radius: 10px; border: 1px solid transparent;
}
.btn-primary { background: var(--ice); color: var(--deep); }
.btn-primary:hover { background: var(--snow); }
.btn-ghost { border-color: var(--rail); color: var(--snow); }
.btn-ghost:hover { border-color: var(--signal); color: var(--ice); }
.hero-rail { margin: 40px 0 0; overflow-x: auto; }
.rail-svg { width: 100%; min-width: 0; height: auto; display: block; }

.ledger {
  background:
    linear-gradient(180deg, rgba(162, 211, 244, 0.07), transparent 46%),
    var(--panel);
  border: 1px solid rgba(162, 211, 244, 0.28);
  border-radius: 12px;
  padding: 14px 16px 12px;
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.28);
}
.ledger-kicker {
  display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--mist); font-weight: 600;
}
.ledger-kicker a { font-size: 12px; letter-spacing: 0; text-transform: none; font-weight: 600; }
.ledger-score { display: flex; align-items: baseline; gap: 8px; margin: 8px 0 2px; }
.ledger-num { font-family: var(--mono); font-size: 22px; font-weight: 600; color: var(--snow); }
.ledger-den { color: var(--mist); font-size: 14px; }
.prose .ledger ol { list-style: none; margin: 8px 0 0; padding: 0; }
.prose .ledger li { margin: 0; }
.ledger li {
  display: grid; grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 10px; align-items: center;
  padding: 6px 0; border-top: 1px solid rgba(52, 67, 79, 0.85);
  font-size: 13.5px;
}
.ledger .name { color: var(--snow); }
.ledger .state { font-family: var(--mono); font-size: 12px; white-space: nowrap; }
.ledger .state.proven { color: var(--proven); }
.ledger .state.gap { color: var(--warning); }
.ledger .state.bad { color: var(--contradiction); }
.ledger-foot { margin: 8px 0 0; color: var(--mist); font-size: 12.5px; }
.dot.gap { background: var(--warning); }
.dot.bad { background: var(--contradiction); }

.landing > section { margin-top: 72px; }
.landing > section.hero { margin-top: 0; }
.landing h2 { font-size: 22px; margin: 0 0 18px; padding-left: 0; letter-spacing: -0.005em; }
.landing h2::before { display: none; }
.prose .loss { list-style: none; margin: 0; padding: 0; max-width: 720px; }
.prose .loss li {
  position: relative; margin: 0; padding: 8px 0 8px 22px;
}
.loss li::before {
  content: ""; position: absolute; left: 0; top: 16px;
  width: 8px; height: 8px; border-radius: 50%; background: var(--ice);
}
.loss li strong { color: var(--snow); }

.prose .steps {
  position: relative; list-style: none; margin: 8px 0 0; padding: 0;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px;
}
.prose .steps li { position: relative; margin: 0; padding-left: 22px; }
.steps li::before {
  content: ""; position: absolute; left: 0; top: 6px;
  width: 8px; height: 8px; border-radius: 50%; background: var(--ice);
}
.steps h3 { margin: 0 0 6px; font-size: 16px; color: var(--snow); }
.steps p { margin: 0; color: var(--mist); font-size: 14.5px; }

.prose > details { margin: 16px 0 22px; padding: 10px 16px; border: 1px solid var(--rail); border-radius: 10px; }
.prose > details > summary { cursor: pointer; font-weight: 600; color: var(--snow); }
.prose > details[open] > summary { margin-bottom: 8px; }

.faq { max-width: 760px; }
.faq details { padding: 8px 0 14px; }
.faq summary { cursor: pointer; font-weight: 600; color: var(--snow); list-style: none; }
.faq summary::-webkit-details-marker { display: none; }
.faq details p { margin: 8px 0 0; color: var(--mist); }

.pm-tablist { display: flex; flex-wrap: wrap; gap: 4px; }
.pm-tab {
  font: inherit; font-size: 13px; font-weight: 600; color: var(--mist);
  background: transparent; border: 1px solid transparent; border-bottom: none;
  border-radius: 8px 8px 0 0; padding: 7px 12px; cursor: pointer;
}
.pm-tab[aria-selected="true"] { color: var(--snow); background: var(--carbon); border-color: var(--rail); }
.pm-tabs figure.code { margin-top: 0; border-radius: 0 12px 12px 12px; }

.path-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.path-card {
  display: block; text-decoration: none;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 12px;
  padding: 22px 24px; transition: border-color 120ms ease;
}
.path-card:hover { border-color: var(--signal); }
.path-card h3 { margin: 12px 0 6px; font-size: 17.5px; color: var(--snow); }
.path-card p { color: var(--mist); margin: 0 0 14px; font-size: 14.5px; }
.path-card ul { margin: 0; padding: 0; list-style: none; }
.path-card li { padding: 4px 0 4px 18px; position: relative; color: var(--ice); font-size: 13.8px; }
.path-card li::before {
  content: ""; position: absolute; left: 0; top: 12px; width: 10px; height: 2px;
  background: var(--signal); border-radius: 2px;
}
.path-card .path-more { display: inline-block; margin-top: 14px; font-size: 13.5px; font-weight: 600; }

.install-cmd { margin: 16px 0 10px; }
.pm-tabs .install-cmd { margin: 0 0 16px; }
.landing .install > p { margin: 0 0 20px; }
.landing .install > .fineprint { margin: 16px 0 0; }
.fineprint { color: var(--mist); font-size: 13.5px; }
.fineprint code { font-family: var(--mono); color: var(--ice); font-size: 12.5px; }

.report-strip {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 14px;
  padding: 22px 26px; margin-top: 44px;
}
.report-strip h2 { margin: 0 0 6px; font-size: 18px; }
.report-strip p { margin: 0; color: var(--mist); font-size: 14px; max-width: 560px; }
.report-strip .report-note { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.proven { background: var(--proven); }

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
  .path-grid, .hero-lower, .prose .steps { grid-template-columns: 1fr; }
  .prose .steps li { padding: 0 0 20px 22px; }
  .rail-svg { min-width: 640px; }
  .footer { padding: 18px 20px; }
}
@media (max-width: 560px) {
  .brand svg.mark.logo { height: 22px; }
  .brand-docs { display: none; }
}
.page-home { position: relative; }
.page-home::before {
  content: "";
  position: absolute; z-index: 0; pointer-events: none;
  top: 0; left: 0; right: 0; height: 860px;
  background:
    radial-gradient(920px 680px at -8% -14%, rgba(162, 211, 244, 0.34), transparent 60%),
    radial-gradient(860px 640px at 108% -10%, rgba(62, 142, 214, 0.62), transparent 56%),
    radial-gradient(640px 360px at 68% 28%, rgba(162, 211, 244, 0.12), transparent 68%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 42%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 42%, transparent 100%);
}
.page-home .topbar {
  background:
    linear-gradient(90deg, rgba(162, 211, 244, 0.1), rgba(62, 142, 214, 0.14) 62%, rgba(17, 19, 24, 0)),
    var(--deep);
  border-bottom-color: rgba(52, 67, 79, 0.45);
}
.page-home .shell { display: block; position: relative; z-index: 1; max-width: 1080px; }
.page-home .footer { position: relative; z-index: 1; }
.page-home .nav-toggle { display: none; }
.page-home .content { padding-top: 72px; }

/* ---------- Preferences ---------- */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}

@media print {
  :root { --deep: #ffffff; --carbon: #f5f6f8; --panel: #eef1f4; --snow: #12161c; --mist: #4a5560; --rail: #c3ccd4; --ice: #1d5f9e; --signal: #2568a8; }
  body { background: #fff; color: #12161c; }
  .page-home::before { display: none; }
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

  /* ----- Copy buttons ----- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".code-copy") : null;
    if (!btn) return;
    var figure = btn.closest("figure.code");
    var code = figure ? figure.querySelector("pre code") : null;
    if (!code) return;
    var text = code.textContent || "";
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
    if (tab) selectPm(tab);
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
  const { root, reportUrl, wordmarkSvg } = args;
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
  const liveReport = reportUrl ? `<a href="${reportUrl}">Live report</a>` : "";
  const reportStrip = reportUrl
    ? `<section class="report-strip">
  <div>
    <h2>This repository publishes its own report</h2>
    <p>Every push to the default branch republishes requirement health for Kibi itself: how many current requirements are fully proven, which ones contradict each other, and which evidence has gone stale.</p>
    <div class="report-note"><span class="dot proven"></span>Proven means fresh end-to-end evidence on the current code snapshot.</div>
  </div>
  <a class="btn btn-ghost" href="${reportUrl}">Open the live report</a>
</section>`
    : "";
  return `<div class="prose landing">
<section class="hero">
  <div class="hero-grid">
    <div>
      <div class="hero-mark">${wordmarkSvg}</div>
      <h1 class="hero-title">Say what the software should do.</h1>
    </div>
    <div class="hero-lower">
      <div>
      <p class="hero-sub">You keep prompting your coding agent. Kibi writes that intent down beside the code, carries it onto every branch, and treats &ldquo;done&rdquo; as a claim that needs fresh evidence.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="${root}guide/quick-start.html">Install Kibi</a>
        <a class="btn btn-ghost" href="${root}guide/reading-the-report.html">Read a health report</a>
      </div>
      <p class="hero-canon">${escapeHtml(SITE_TAGLINE)}</p>
    </div>
    <aside class="ledger" aria-label="Example requirement-health ledger">
      <div class="ledger-kicker"><span>Example ledger</span>${liveReport}</div>
      <div class="ledger-score"><span class="ledger-num">4</span><span class="ledger-den">of 11 fully proven</span></div>
      <ol>
        <li><span class="dot proven" aria-hidden="true"></span><span class="name">Drafts save when you leave</span><span class="state proven">Proven</span></li>
        <li><span class="dot gap" aria-hidden="true"></span><span class="name">Export keeps the current filters</span><span class="state gap">Proof gap</span></li>
        <li><span class="dot bad" aria-hidden="true"></span><span class="name">Exactly three user roles</span><span class="state bad">Contradiction</span></li>
      </ol>
      <p class="ledger-foot">An example, not this repository&rsquo;s live numbers.</p>
    </aside>
    </div>
  </div>
  <div class="hero-rail">${RAIL_SVG}</div>
</section>
<section>
  <h2>What usually gets lost</h2>
  <ul class="loss">
    <li><strong>The prompt.</strong> The session ends, and the reason for yesterday&rsquo;s change is gone.</li>
    <li><strong>The link to the code.</strong> A ticket can say what you wanted. It rarely names the function that was supposed to do it.</li>
    <li><strong>The meaning of green.</strong> A passing suite does not say which product behavior is still true on this commit.</li>
  </ul>
</section>
<section>
  <h2>What you actually do</h2>
  <ol class="steps">
    <li>
      <h3>State the behavior</h3>
      <p>Prompt the way you already do. &ldquo;Draft edits must save when someone navigates away.&rdquo; You do not fill in a requirements form.</p>
    </li>
    <li>
      <h3>Approve real decisions</h3>
      <p>The agent proposes a plan before it writes project knowledge. You approve it, or you correct the product call. The bookkeeping stays with the agent.</p>
    </li>
    <li>
      <h3>Read the result</h3>
      <p>The health report names what is proven, what still has a gap, and what contradicts itself. A green test run is a different fact.</p>
    </li>
  </ol>
</section>
<section class="paths">
  <h2>Where to go next</h2>
  <div class="path-grid">
    <a class="path-card" href="${root}guide/welcome.html">
      <span class="chip">Guide</span>
      <h3>Use Kibi on a repository</h3>
      <p>Install it, connect the agent you already use, and learn how to read the first health report. Written for the person prompting, not for the agent.</p>
      <ul>
        <li>What is Kibi?</li>
        <li>Quick start</li>
        <li>Connect your coding agent</li>
        <li>Read the health report</li>
      </ul>
      <span class="path-more">Start the guide &rarr;</span>
    </a>
    <a class="path-card" href="${root}reference/cli.html">
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
<section class="install" id="install">
  <h2>Add Kibi to the repository</h2>
  <p>Kibi is driven by your coding agent, so the recommended setup is a prompt. Your agent installs the packages, runs <code>kibi init</code>, connects itself to Kibi, and bootstraps the knowledge base behind a plan you approve. The package-manager tabs are the manual route; <code>kibi init</code> alone does not invent what the product does.</p>
  <div class="pm-tabs" data-pm-tabs>
    <div class="pm-tablist" role="tablist" aria-label="Setup method">${installTabs}</div>
    ${installPanels}
  </div>
  <p class="fineprint">Requires Node.js 22+. SWI-Prolog is bundled on Linux (x64, arm64) and macOS; other platforms need <code>swipl</code> (SWI-Prolog 9.0+) on your <code>PATH</code>. A system <code>swipl</code> is only a fallback; set <code>KIBI_SWIPL=system</code> to prefer it. Bun commands and per-platform setup are in the <a href="${root}guide/install.html">installation guide</a>.</p>
</section>
<section>
  <h2>Questions people ask first</h2>
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
      <p>TypeScript and JavaScript work out of the box. Add the optional <code>kibi-plugin-treesitter</code> package for Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, and Terraform/HCL. It runs offline with pinned grammars. Setup is in the <a href="${root}reference/plugins.html">plugin reference</a>.</p>
    </details>
    <details>
      <summary>Can my agent ask Kibi what governs a change?</summary>
      <p>Yes. <code>kb_search</code> accepts a plain question and, alongside ranked matches, returns the current requirements that govern the topic with their linked facts, scenarios, tests, and ADRs. Superseded requirements are listed separately so they are not read as current policy. These links help the agent find context; consistency and proof still come from the checks.</p>
    </details>
    <details>
      <summary>What counts as proven?</summary>
      <p>A requirement is proven only when a test that claims to verify it has fresh end-to-end evidence for the current code. A passing unit test, a coverage percentage, or an old receipt does not count.</p>
    </details>
    <details>
      <summary>Will Kibi decide the product for me?</summary>
      <p>No. <code>kibi init</code> creates the directory and the Git hooks. It does not infer behavior. Checks prove what was encoded. Missing knowledge stays visible.</p>
    </details>
  </div>
</section>
${reportStrip}
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
  <a class="external" href="${githubUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
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
<style>${styles}</style>
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
  <span>Kibi documentation &mdash; built from the repository <code style="font-family:var(--mono)">docs/</code> sources. ${editLink}</span>
  <nav aria-label="Footer">
    <a class="external" href="${githubUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
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
