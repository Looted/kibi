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

// implements REQ-docs-site-pages
export type Section = "guide" | "reference";

// implements REQ-docs-site-pages
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

// implements REQ-docs-site-pages
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip fixed dimensions from a canonical mark so CSS controls its size. */
// implements REQ-docs-site-pages
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

const RAIL_SVG = `<svg class="rail-svg" viewBox="0 0 760 96" role="img" aria-label="Intent travels a rail through compiled requirements and enforcement to a proof gate" fill="none">
  <line x1="52" y1="40" x2="668" y2="40" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="40" cy="40" r="13" fill="#a2d3f4"/>
  <circle cx="228" cy="40" r="5" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="416" cy="40" r="5" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <circle cx="604" cy="40" r="5" fill="#111318" stroke="#3e8ed6" stroke-width="2"/>
  <path d="M682 14v52M698 14v52" stroke="#3e8ed6" stroke-width="2" stroke-linecap="round"/>
  <circle cx="726" cy="40" r="7" fill="#63c99a"/>
  <g fill="#aab8c2" font-family="-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="13">
    <text x="40" y="80" text-anchor="middle">Intent</text>
    <text x="228" y="80" text-anchor="middle">Requirements</text>
    <text x="416" y="80" text-anchor="middle">Enforcement</text>
    <text x="604" y="80" text-anchor="middle">Evidence</text>
    <text x="712" y="80" text-anchor="middle">Proof</text>
  </g>
</svg>`;

// implements REQ-docs-site-pages
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
  background: rgba(17, 19, 24, 0.92);
  border-bottom: 1px solid var(--rail);
  backdrop-filter: blur(4px);
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
.nav-item {
  position: relative; display: block;
  padding: 6px 10px 6px 22px; margin: 1px 0;
  color: var(--mist); text-decoration: none;
  font-size: 13.8px; border-radius: 8px; line-height: 1.45;
}
.nav-item::before {
  content: ""; position: absolute; left: 9px; top: 0; bottom: 0;
  width: 2px; background: transparent; border-radius: 2px;
}
.nav-item:hover { color: var(--snow); background: rgba(25, 28, 34, 0.85); }
.nav-item[aria-current="page"] { color: var(--ice); background: rgba(62, 142, 214, 0.1); }
.nav-item[aria-current="page"]::before { background: var(--signal); }
.nav-item[aria-current="page"]::after {
  content: ""; position: absolute; left: 6px; top: 50%; transform: translateY(-50%);
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
.code-copy.copied { color: var(--deep); background: var(--proven); border-color: var(--proven); font-weight: 600; }
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
.footer nav { display: flex; flex-wrap: wrap; gap: 18px; }
.footer a { color: var(--mist); }
.footer a:hover { color: var(--snow); }
.footer .commit { font-family: var(--mono); font-size: 12px; }

/* ---------- Landing ---------- */
.hero { padding: 26px 0 10px; }
.hero-mark svg.mark { width: min(300px, 72vw); height: auto; display: block; }
.hero-title {
  font-size: clamp(24px, 3.4vw, 34px); line-height: 1.22; letter-spacing: -0.015em;
  max-width: 760px; margin: 26px 0 14px; font-weight: 700;
}
.hero-sub { color: var(--mist); font-size: 16.5px; max-width: 700px; margin: 0 0 26px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 34px; }
.btn {
  display: inline-block; text-decoration: none; font-weight: 600; font-size: 14.5px;
  padding: 10px 20px; border-radius: 10px; border: 1px solid transparent;
}
.btn-primary { background: var(--ice); color: var(--deep); }
.btn-primary:hover { background: var(--snow); }
.btn-ghost { border-color: var(--rail); color: var(--snow); }
.btn-ghost:hover { border-color: var(--signal); color: var(--ice); }
.hero-rail { margin: 8px 0 6px; overflow-x: auto; }
.rail-svg { width: min(760px, 100%); min-width: 560px; height: auto; display: block; }

.railline { position: relative; height: 2px; background: var(--rail); margin: 40px 0; border-radius: 2px; }
.railline::before {
  content: ""; position: absolute; left: 0; top: -3.5px;
  width: 9px; height: 9px; border-radius: 50%; background: var(--ice);
}

.landing h2 { font-size: 22px; margin: 0 0 18px; letter-spacing: -0.005em; }
.path-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.path-card {
  display: block; text-decoration: none;
  background: var(--panel); border: 1px solid var(--rail); border-radius: 14px;
  padding: 22px 24px; transition: border-color 120ms ease, transform 120ms ease;
}
.path-card:hover { border-color: var(--signal); transform: translateY(-2px); }
.path-card h3 { margin: 12px 0 6px; font-size: 17.5px; color: var(--snow); }
.path-card p { color: var(--mist); margin: 0 0 14px; font-size: 14.5px; }
.path-card ul { margin: 0; padding: 0; list-style: none; }
.path-card li { padding: 4px 0 4px 18px; position: relative; color: var(--ice); font-size: 13.8px; }
.path-card li::before {
  content: ""; position: absolute; left: 0; top: 12px; width: 10px; height: 2px;
  background: var(--signal); border-radius: 2px;
}
.path-card .path-more { display: inline-block; margin-top: 14px; font-size: 13.5px; font-weight: 600; }

.feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.feature {
  background: var(--carbon); border: 1px solid rgba(52, 67, 79, 0.6); border-radius: 14px;
  padding: 18px 20px;
}
.feature h3 { margin: 0 0 6px; font-size: 15.5px; color: var(--snow); display: flex; align-items: baseline; gap: 10px; }
.feature h3::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--ice); flex-shrink: 0; transform: translateY(-1px); }
.feature p { margin: 0; color: var(--mist); font-size: 13.8px; }
.feature p strong { color: var(--snow); }

.install-cmd { margin: 16px 0 10px; }
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
  .path-grid, .feature-grid { grid-template-columns: 1fr; }
  .footer { padding: 18px 20px; }
}
@media (max-width: 560px) {
  .brand svg.mark.logo { height: 22px; }
  .brand-docs { display: none; }
}

/* ---------- Preferences ---------- */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}

@media print {
  :root { --deep: #ffffff; --carbon: #f5f6f8; --panel: #eef1f4; --snow: #12161c; --mist: #4a5560; --rail: #c3ccd4; --ice: #1d5f9e; --signal: #2568a8; }
  body { background: #fff; color: #12161c; }
  .topbar, .sidebar, .toc, .search, .nav-toggle, .code-copy, .backdrop, .pager, .hlink { display: none !important; }
  .shell { display: block; max-width: none; }
  .content { padding: 0; }
  figure.code, .tablewrap, .prose blockquote { border-color: #c3ccd4; background: #f5f6f8; }
  figure.code code { color: #12161c; }
  .prose code { background: #eef1f4; color: #1d5f9e; }
  a { color: #1d5f9e; }
}
`;

// implements REQ-docs-site-pages
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

// implements REQ-docs-site-pages
export function landingContent(args: {
  root: string;
  reportUrl: string | null;
  wordmarkSvg: string;
  installCommand: string;
}): string {
  const { root, reportUrl, wordmarkSvg, installCommand } = args;
  const reportStrip = reportUrl
    ? `<section class="report-strip">
  <div>
    <h2>Watch the proof, not the promise</h2>
    <p>Every push to the default branch republishes the live requirement-health report: the share of requirements with current proof, open contradictions, and stale evidence &mdash; generated from one coverage snapshot.</p>
    <div class="report-note"><span class="dot proven"></span>Proven means fresh end-to-end evidence tied to the current code snapshot.</div>
  </div>
  <a class="btn btn-ghost" href="${reportUrl}">Open the live report</a>
</section>`
    : "";
  return `<div class="prose landing">
<section class="hero">
  <div class="hero-mark">${wordmarkSvg}</div>
  <h1 class="hero-title">Prompt the intent. Kibi makes the agent remember it &mdash; and prove the implementation.</h1>
  <p class="hero-sub">Kibi turns product intent into an enforceable, branch-local model. Your coding agent maintains the requirements, scenarios, tests, and code links; deterministic checks keep them coherent and prove the implementation against them. No tickets, no parallel bureaucracy &mdash; the prompt stays the interface.</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="${root}guide/welcome.html">Read the guide</a>
    <a class="btn btn-ghost" href="${root}guide/quick-start.html">Quick start</a>
  </div>
  <div class="hero-rail">${RAIL_SVG}</div>
</section>
<div class="railline" aria-hidden="true"></div>
<section class="paths">
  <h2>Choose your path</h2>
  <div class="path-grid">
    <a class="path-card" href="${root}guide/welcome.html">
      <span class="chip">Guide</span>
      <h3>Understand and use Kibi</h3>
      <p>What Kibi is, how to install it, how to connect your coding agent, and how to read your first requirement-health report. Plain language, no prior compiler knowledge needed.</p>
      <ul>
        <li>What is Kibi?</li>
        <li>Quick start</li>
        <li>Installation</li>
        <li>Connect your coding agent</li>
        <li>Troubleshooting</li>
      </ul>
      <span class="path-more">Start the guide &rarr;</span>
    </a>
    <a class="path-card" href="${root}reference/cli.html">
      <span class="chip chip-reference">Reference</span>
      <h3>Precise technical detail</h3>
      <p>Complete, dry, exact documentation for daily operation: every CLI command, MCP tool, entity type, validation rule, and error the system can produce.</p>
      <ul>
        <li>CLI reference</li>
        <li>MCP tools</li>
        <li>Entity schema</li>
        <li>Inference rules</li>
        <li>Error reference</li>
      </ul>
      <span class="path-more">Open the reference &rarr;</span>
    </a>
  </div>
</section>
<div class="railline" aria-hidden="true"></div>
<section class="features">
  <h2>What Kibi does</h2>
  <div class="feature-grid">
    <div class="feature"><h3>Your agent remembers the product</h3><p>Requirements, scenarios, and code links live beside the code and return to the agent's context automatically. The prompt stays the interface; <strong>Kibi carries the memory</strong>.</p></div>
    <div class="feature"><h3>Deterministic checks, not good intentions</h3><p>A Prolog safety layer validates every change for <strong>contradictions, unsupported invention, and incomplete semantics</strong> before it becomes accepted project knowledge.</p></div>
    <div class="feature"><h3>Proof you can inspect</h3><p>Proof-bearing tests record fresh end-to-end evidence tied to the current code snapshot. The health report shows <strong>exactly what is proven</strong> and what is still waiting.</p></div>
    <div class="feature"><h3>Knowledge that follows your branch</h3><p>Each Git branch carries its own project model. Feature context stays isolated and <strong>returns when you come back</strong> &mdash; nothing leaks between branches.</p></div>
  </div>
</section>
<div class="railline" aria-hidden="true"></div>
<section class="install">
  <h2>Start in two commands</h2>
  <p>Add Kibi to an existing repository and let your agent bootstrap the rest.</p>
  <figure class="code install-cmd">
    <span class="code-lang">bash</span>
    <button type="button" class="code-copy" aria-label="Copy install commands">Copy</button>
    <pre><code>${escapeHtml(installCommand)}</code></pre>
  </figure>
  <p class="fineprint">Requires <code>swipl</code> (SWI-Prolog 9.0+) on your <code>PATH</code>. See the <a href="${root}guide/install.html">installation guide</a> for your package manager and platform.</p>
</section>
${reportStrip}
</div>`;
}

// implements REQ-docs-site-pages
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
  // The report URL is relative to the site root (e.g. "../kibi-report/"):
  // every page prepends its own root prefix; absolute URLs pass through.
  const reportHref = reportUrl
    ? reportUrl.startsWith("http")
      ? reportUrl
      : `${root}${reportUrl}`
    : null;

  const topbarNav = `<nav class="topbar-nav" aria-label="Primary">
  <a href="${root}guide/welcome.html">Guide</a>
  <a href="${root}reference/cli.html">Reference</a>
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
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="icon" href="${favicon}">
<style>${styles}</style>
</head>
<body>
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
<nav class="sidebar" id="sidebar" aria-label="Documentation">${navHtml}</nav>
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
