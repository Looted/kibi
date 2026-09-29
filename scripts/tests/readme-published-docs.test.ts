import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DOCS,
  PUBLISHED_DOCS_ORIGIN,
  publishedLlmsIndexHref,
  publishedPageHref,
} from "../../docs-site/catalog.ts";
import { renderLlmsTxt } from "../../docs-site/llms.ts";
import { readmePublishedDocProblems } from "../../docs-site/readme-links.ts";

// executable_for TEST-docs-readme-published-links
// README documentation links and the published llms.txt index both come from
// the documentation catalog, so a renamed page cannot leave a GitHub link behind.

const repoRoot = path.resolve(import.meta.dir, "../..");

function runDocsSite(out: string) {
  return spawnSync("bun", ["docs-site/build.ts", "--out", out], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("published documentation links", () => {
  test("README and the language-model index follow the documentation catalog", () => {
    const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");
    expect(readmePublishedDocProblems(readme)).toEqual([]);
    expect(readme).toContain("docs/examples/github/kibi-report.yml");

    const llms = renderLlmsTxt(repoRoot);
    for (const page of DOCS) {
      expect(llms).toContain(publishedPageHref(page));
    }
    expect(llms).not.toContain("](docs/");

    const out = mkdtempSync(path.join(tmpdir(), "kibi-docs-site-"));
    try {
      const built = runDocsSite(out);
      expect(built.status).toBe(0);
      const index = readFileSync(path.join(out, "index.html"), "utf8");
      expect(index).toContain('href="llms.txt"');
      expect(index).toContain(
        `name="llms-txt" content="${publishedLlmsIndexHref()}"`,
      );
      expect(readFileSync(path.join(out, "llms.txt"), "utf8")).toBe(llms);

      const published = [
        ...readme.matchAll(
          new RegExp(
            `${PUBLISHED_DOCS_ORIGIN.replaceAll(".", "\\.")}/[^)\\s]+`,
            "g",
          ),
        ),
      ].map((match) => match[0]);
      for (const href of published) {
        const rest = href.slice(PUBLISHED_DOCS_ORIGIN.length + 1);
        const hashAt = rest.indexOf("#");
        if (hashAt === -1) continue;
        const sitePath = rest.slice(0, hashAt);
        const id = rest.slice(hashAt + 1);
        const html = readFileSync(path.join(out, sitePath), "utf8");
        expect(html).toContain(`id="${id}"`);
      }
      expect(
        published.some((href) => href.startsWith(publishedLlmsIndexHref())),
      ).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
