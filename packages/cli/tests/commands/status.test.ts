import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync as removeSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

describe("kibi status", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-status-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: User authentication
status: open
---

Initial body.
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  }, 30000); // kibi init + sync can take ~10s; allow 30s for slower CI environments

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("reports missing snapshot status immediately after init before first sync", () => {
    const initDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-status-init-"),
    );

    try {
      execSync("git init -b main", { cwd: initDir, stdio: "pipe" });
      execSync(`bun ${kibiBin} init`, { cwd: initDir, stdio: "pipe" });

      const output = execSync(`bun ${kibiBin} status --format json`, {
        cwd: initDir,
        encoding: "utf8",
      });

      const result = JSON.parse(output) as {
        branch: string;
        dirty: boolean;
        snapshotId: string;
        syncedAt: string | null;
        syncState: string;
      };

      expect(result.branch).toBe("main");
      expect(result.snapshotId).toBe("missing");
      expect(result.syncedAt).toBeNull();
      expect(result.dirty).toBe(true);
      expect(result.syncState).toBe("unknown");
    } finally {
      rmSync(initDir, { recursive: true, force: true });
    }
  }, 15000);

  test("reports stale status after workspace edits without sync", () => {
    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: User authentication
status: open
---

Changed after sync.
`,
    );

    const output = execSync(`bun ${kibiBin} status --format json`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const result = JSON.parse(output) as {
      branch: string;
      dirty: boolean;
      syncState: string;
    };
    expect(result.branch).toBe("main");
    expect(result.dirty).toBe(true);
    expect(result.syncState).toBe("stale");
  }, 15000);

  test("reports fresh status immediately after sync with absolute source paths", () => {
    const freshDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-status-fresh-"),
    );

    try {
      execSync("git init -b main", { cwd: freshDir, stdio: "pipe" });
      execSync(`bun ${kibiBin} init`, { cwd: freshDir, stdio: "pipe" });
      mkdirSync(path.join(freshDir, "documentation", "requirements"), {
        recursive: true,
      });

      writeFileSync(
        path.join(freshDir, "documentation", "requirements", "REQ-ABS-001.md"),
        `---
id: REQ-ABS-001
title: Absolute source path status
status: open
---
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: freshDir, stdio: "pipe" });

      const output = execSync(`bun ${kibiBin} status --format json`, {
        cwd: freshDir,
        encoding: "utf8",
      });

      const result = JSON.parse(output) as {
        dirty: boolean;
        syncState: string;
      };
      expect(result.dirty).toBe(false);
      expect(result.syncState).toBe("fresh");
    } finally {
      rmSync(freshDir, { recursive: true, force: true });
    }
  }, 15000);

  test("keeps status fresh after syncing with documentation README files", () => {
    const readmeDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-status-readme-"),
    );

    try {
      execSync("git init -b main", { cwd: readmeDir, stdio: "pipe" });
      execSync(`bun ${kibiBin} init`, { cwd: readmeDir, stdio: "pipe" });
      mkdirSync(path.join(readmeDir, "documentation", "requirements"), {
        recursive: true,
      });
      mkdirSync(
        path.join(
          readmeDir,
          "documentation",
          "tests",
          "e2e",
          "packed",
          "fixtures",
        ),
        { recursive: true },
      );

      writeFileSync(
        path.join(
          readmeDir,
          "documentation",
          "requirements",
          "REQ-README-001.md",
        ),
        `---
id: REQ-README-001
title: README status freshness
status: open
---
`,
      );
      writeFileSync(
        path.join(
          readmeDir,
          "documentation",
          "tests",
          "e2e",
          "packed",
          "fixtures",
          "README.md",
        ),
        `# Fixture README
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: readmeDir, stdio: "pipe" });

      const output = execSync(`bun ${kibiBin} status --format json`, {
        cwd: readmeDir,
        encoding: "utf8",
      });

      const result = JSON.parse(output) as {
        dirty: boolean;
        syncState: string;
      };
      expect(result.dirty).toBe(false);
      expect(result.syncState).toBe("fresh");
    } finally {
      rmSync(readmeDir, { recursive: true, force: true });
    }
  }, 15000);

  test("ignores generic documentation notes without entity frontmatter", () => {
    const notesDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-status-notes-"),
    );

    try {
      execSync("git init -b main", { cwd: notesDir, stdio: "pipe" });
      execSync(`bun ${kibiBin} init`, { cwd: notesDir, stdio: "pipe" });
      mkdirSync(path.join(notesDir, "documentation", "requirements"), {
        recursive: true,
      });
      writeFileSync(
        path.join(
          notesDir,
          "documentation",
          "requirements",
          "REQ-NOTES-001.md",
        ),
        "---\nid: REQ-NOTES-001\ntitle: Notes fixture\nstatus: open\n---\n",
      );
      writeFileSync(
        path.join(notesDir, "documentation", "learnings.md"),
        "# Implementation learnings\n\n- Keep sync and status behavior aligned.\n",
      );

      execSync(`bun ${kibiBin} sync`, { cwd: notesDir, stdio: "pipe" });

      const output = execSync(`bun ${kibiBin} status --format json`, {
        cwd: notesDir,
        encoding: "utf8",
      });

      const result = JSON.parse(output) as {
        dirty: boolean;
        syncState: string;
      };
      expect(result.dirty).toBe(false);
      expect(result.syncState).toBe("fresh");
    } finally {
      rmSync(notesDir, { recursive: true, force: true });
    }
  }, 30000);

  test("reports stale status after adding a new documentation file without sync", () => {
    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-002.md"),
      `---
id: REQ-002
title: Session expiry
status: open
---
`,
    );

    const output = execSync(`bun ${kibiBin} status --format json`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const result = JSON.parse(output) as {
      dirty: boolean;
      syncState: string;
    };
    expect(result.dirty).toBe(true);
    expect(result.syncState).toBe("stale");
  }, 15000);

  test("reports stale status after deleting a synced source file", () => {
    removeSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
    );

    const output = execSync(`bun ${kibiBin} status --format json`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const result = JSON.parse(output) as {
      dirty: boolean;
      syncState: string;
    };
    expect(result.dirty).toBe(true);
    expect(result.syncState).toBe("stale");
  }, 15000);

  test("shows table output by default", () => {
    const output = execSync(`bun ${kibiBin} status`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("Branch");
    expect(output).toContain("Sync State");
  }, 15000);
});
