/**
 * The documentation catalog is the only map from a repository source to a
 * published page. The site build, the README link check, and llms.txt all
 * read it, so a renamed slug cannot leave a GitHub link or a stale index
 * behind unnoticed.
 */

// implements REQ-docs-readme-published-links
export type DocSection = "guide" | "reference";

export type DocPage = {
  slug: string;
  section: DocSection;
  /** Sidebar group label, in manifest order, under Guide or Reference. */
  group: string;
  title?: string;
  description?: string;
  /** Repository-root-relative path of the markdown source. */
  source: string;
};

/**
 * Published site origin, without a trailing slash. The documentation site is
 * the project Pages root; the requirement-health report lives beside it under
 * REPORT_PATH.
 */
// implements REQ-docs-readme-published-links
export const PUBLISHED_SITE_ORIGIN = "https://looted.github.io/kibi";

/**
 * Cookieless Umami page analytics for the published documentation site. The
 * site build emits the script only when given a website ID (the Pages build
 * passes KIBI_UMAMI_WEBSITE_ID), so default builds stay self-contained, and
 * the script only reports on the published host. Generated `kibi report`
 * pages never load it.
 */
// implements REQ-docs-site-analytics
export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";
// implements REQ-docs-site-analytics
export const UMAMI_DOMAINS = new URL(PUBLISHED_SITE_ORIGIN).hostname;

/**
 * The one public tagline. The landing page, page metadata, and llms.txt all
 * read it, so the site cannot publish competing variants.
 */
// implements REQ-docs-readme-published-links
export const SITE_TAGLINE =
  "Prompt the intent. Kibi makes the agent remember it—and prove the implementation.";

/**
 * The recommended install: a prompt the user pastes into their coding agent.
 * The landing page renders it, and the README and quick-start page must quote
 * it verbatim, so every entry point asks the agent for the same setup.
 */
// implements REQ-docs-site-root-pages
export const AGENT_SETUP_PROMPT = `Set up Kibi (https://github.com/Looted/kibi) in this repository, then bootstrap its knowledge base.

1. Install: confirm Node.js 22+ is available. With the package manager this repository already uses, add kibi-core, kibi-cli and kibi-mcp as dev dependencies. Do not skip optional dependencies; the bundled SWI-Prolog runtime is one.
2. Initialize: run every \`kibi\` command through the package manager's local runner (npm: \`npm exec -- kibi <command>\`). Run \`kibi init\`; if it reports a problem, run \`kibi doctor\` and fix what it names. If this platform has no bundled SWI-Prolog, tell me what to install and stop.
3. Connect: register the project-local \`kibi-mcp\` server for the agent host you are running in, following https://looted.github.io/kibi/guide/connect-an-agent.html. Prefer project-scoped configuration, and ask me before installing a plugin or changing global settings. Until the kb_* tools are visible to you, use Kibi's CLI JSON routes instead.
4. Bootstrap: run \`kibi skills load kibi-bootstrap --format markdown\` and follow that skill exactly. It starts by asking me where product intent lives outside the code (issue trackers, wikis, specs) and which sources to trust; read them through the connectors you have and cite them. Show me the complete plan and its hash, and write nothing until I approve it.
5. Verify: run \`kibi check\` and \`kibi status\`, fix anything they report, and summarize what was added. Do not commit; I will review the changes.`;

/** Site-root-relative directory of the requirement-health report. */
// implements REQ-docs-site-root-pages
export const REPORT_PATH = "kibi-report/";

// implements REQ-docs-readme-published-links
export const LLMS_INDEX_PATH = "llms.txt";

// implements REQ-docs-readme-published-links
export const DOCS: readonly DocPage[] = [
  {
    slug: "welcome",
    section: "guide",
    group: "Start",
    source: "docs-site/content/welcome.md",
  },
  {
    slug: "quick-start",
    section: "guide",
    group: "Start",
    source: "docs-site/content/quick-start.md",
  },
  {
    slug: "install",
    section: "guide",
    group: "Start",
    title: "Installation",
    description:
      "Install the Kibi packages with your package manager; SWI-Prolog is bundled on Linux and macOS, with manual setup for other platforms.",
    source: "docs/install.md",
  },
  {
    slug: "connect-an-agent",
    section: "guide",
    group: "Start",
    source: "docs-site/content/connect-an-agent.md",
  },
  {
    slug: "how-it-works",
    section: "guide",
    group: "Understand",
    source: "docs-site/content/how-it-works.md",
  },
  {
    slug: "reading-the-report",
    section: "guide",
    group: "Understand",
    source: "docs-site/content/reading-the-report.md",
  },
  {
    slug: "proof-ladder",
    section: "guide",
    group: "Understand",
    title: "The proof ladder",
    description:
      "From a stated requirement to fresh end-to-end evidence: the stages a requirement climbs to count as proven.",
    source: "docs/proof-ladder.md",
  },
  {
    slug: "modeling",
    section: "guide",
    group: "Understand",
    title: "Modeling requirements",
    description:
      "A practical cheat sheet for turning product intent into requirements, scenarios, tests, facts, and code links.",
    source: "docs/modeling-cheatsheet.md",
  },
  {
    slug: "github-integration",
    section: "guide",
    group: "Ship",
    title: "Publish requirement health",
    description:
      "Publish the requirement-health report and badge on GitHub Pages so proof status is visible on every pull request.",
    source: "docs/github-integration.md",
  },
  {
    slug: "troubleshooting",
    section: "guide",
    group: "Ship",
    title: "Troubleshooting",
    description:
      "Recovery procedures for setup problems and broken Kibi state.",
    source: "docs/troubleshooting.md",
  },
  {
    slug: "cli",
    section: "reference",
    group: "Commands",
    title: "CLI reference",
    description:
      "Every kibi CLI command, flag, and dedicated JSON operation route, command by command.",
    source: "docs/cli-reference.md",
  },
  {
    slug: "mcp",
    section: "reference",
    group: "Commands",
    title: "MCP tools",
    description:
      "The canonical MCP tool catalog, onboarding contract, and schemas exposed by the Kibi MCP server.",
    source: "docs/mcp-reference.md",
  },
  {
    slug: "errors",
    section: "reference",
    group: "Commands",
    title: "Error reference",
    description: "Every MCP error code, its meaning, and the recovery path.",
    source: "docs/error-reference.md",
  },
  {
    slug: "entity-schema",
    section: "reference",
    group: "Model",
    title: "Entity schema",
    description:
      "The eight entity types, their fields, and every typed relationship the knowledge graph supports.",
    source: "docs/entity-schema.md",
  },
  {
    slug: "inference-rules",
    section: "reference",
    group: "Model",
    title: "Inference rules",
    description:
      "The deterministic validation, contradiction, and coherence rules Kibi enforces.",
    source: "docs/inference-rules.md",
  },
  {
    slug: "symbol-taxonomy",
    section: "reference",
    group: "Model",
    title: "Symbol traceability taxonomy",
    description:
      "How code symbols are classified and linked to requirements, and what counts as sufficient traceability.",
    source: "docs/symbol-traceability-taxonomy.md",
  },
  {
    slug: "architecture",
    section: "reference",
    group: "Model",
    title: "Architecture",
    description:
      "Storage layout, branch isolation, and the data flow between the CLI, MCP server, and Prolog engine.",
    source: "docs/architecture.md",
  },
  {
    slug: "proving",
    section: "reference",
    group: "Proof",
    title: "Proving requirements",
    description:
      "Proof contracts, the kibi prove workflow, and the kibi.proof-run.v1 producer artifact contract.",
    source: "docs/proving-requirements.md",
  },
  {
    slug: "plugins",
    section: "reference",
    group: "Extend",
    title: "Plugin development",
    description:
      "Extend Kibi with capability plugins: the SDK, manifests, and plugin lifecycle.",
    source: "docs/plugin-development.md",
  },
  {
    slug: "agent-onboarding",
    section: "reference",
    group: "Extend",
    title: "Agent onboarding",
    description:
      "The copy-paste discovery snippet that lets any coding agent find and use Kibi's interfaces.",
    source: "docs/generic-agent-onboarding.md",
  },
];

// implements REQ-docs-readme-published-links
export function sitePagePath(page: DocPage): string {
  return `${page.section}/${page.slug}.html`;
}

// implements REQ-docs-readme-published-links
export function publishedPageHref(page: DocPage, fragment = ""): string {
  const hash =
    fragment === "" ? "" : fragment.startsWith("#") ? fragment : `#${fragment}`;
  return `${PUBLISHED_SITE_ORIGIN}/${sitePagePath(page)}${hash}`;
}

// implements REQ-docs-readme-published-links
export function publishedLlmsIndexHref(): string {
  return `${PUBLISHED_SITE_ORIGIN}/${LLMS_INDEX_PATH}`;
}

// implements REQ-docs-readme-published-links
export function pageForSource(source: string): DocPage | undefined {
  return DOCS.find((page) => page.source === source);
}

// implements REQ-docs-readme-published-links
export function pageForSitePath(sitePath: string): DocPage | undefined {
  return DOCS.find((page) => sitePagePath(page) === sitePath);
}
