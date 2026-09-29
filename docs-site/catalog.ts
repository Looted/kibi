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

/** Published site origin, without a trailing slash. */
// implements REQ-docs-readme-published-links
export const PUBLISHED_DOCS_ORIGIN = "https://looted.github.io/kibi/docs";

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
      "Install the Kibi packages with your package manager and set up the SWI-Prolog prerequisite.",
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
  return `${PUBLISHED_DOCS_ORIGIN}/${sitePagePath(page)}${hash}`;
}

// implements REQ-docs-readme-published-links
export function publishedLlmsIndexHref(): string {
  return `${PUBLISHED_DOCS_ORIGIN}/${LLMS_INDEX_PATH}`;
}

// implements REQ-docs-readme-published-links
export function pageForSource(source: string): DocPage | undefined {
  return DOCS.find((page) => page.source === source);
}

// implements REQ-docs-readme-published-links
export function pageForSitePath(sitePath: string): DocPage | undefined {
  return DOCS.find((page) => sitePagePath(page) === sitePath);
}
