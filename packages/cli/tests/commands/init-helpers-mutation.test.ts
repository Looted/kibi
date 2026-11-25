import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import {
  KIBI_HOOK_BEGIN,
  copySchemaFiles,
  createKbDirectoryStructure,
  createManifestFile,
  ensureSymbolsManifestFile,
  getCurrentBranch,
  hasManagedHooks,
  hookDelegationSnippet,
  installGitHooks,
  installHook,
  isManagedHookName,
  outdatedManagedHooks,
  updateGitIgnore,
} from "../../src/commands/init-helpers.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

// The filesystem side of `kibi init`: the .kb/ skeleton, .gitignore entries,
// schema files and managed Git hooks, pinned against temporary directories.

let root: string;
let logs: string[];
let errors: string[];
let restores: Array<() => void>;

beforeEach(() => {
  root = createTempDir("kibi-init-helpers-mut-");
  logs = [];
  errors = [];
  restores = [isolateKibiEnv()];
  const log = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  const error = spyOn(console, "error").mockImplementation(
    (...args: unknown[]) => {
      errors.push(args.join(" "));
    },
  );
  restores.push(
    () => log.mockRestore(),
    () => error.mockRestore(),
  );
});

afterEach(() => {
  for (const restore of restores.reverse()) restore();
  removeTempDir(root);
});

const read = (file: string) => readFileSync(file).toString();
const isExecutable = (file: string) => (statSync(file).mode & 0o777) === 0o755;

describe("getCurrentBranch", () => {
  test("reports why the branch cannot be resolved", async () => {
    // A directory that does not exist has no branch to resolve.
    await expect(getCurrentBranch(path.join(root, "missing"))).rejects.toThrow(
      "Failed to resolve active branch",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.length).toBeGreaterThan(0);
  });
});

describe("createKbDirectoryStructure", () => {
  test("creates every lane and the hashed branch store, twice in a row", () => {
    const kbDir = path.join(root, ".kb");
    createKbDirectoryStructure(kbDir, "main");
    createKbDirectoryStructure(kbDir, "main");
    for (const lane of ["schema", "requirements", "branches"]) {
      expect(statSync(path.join(kbDir, lane)).isDirectory()).toBe(true);
    }
    const store = branchStorePath(root, "main");
    expect(existsSync(path.join(store, "branch.json"))).toBe(true);
    expect(logs).toEqual([
      "✓ Ensured .kb/ directory structure",
      "✓ Verified hashed branch store for main",
      "✓ Ensured .kb/ directory structure",
      "✓ Verified hashed branch store for main",
    ]);
  });

  test("refuses a lane that is a file", () => {
    const kbDir = path.join(root, ".kb");
    mkdirSync(kbDir);
    writeFileSync(path.join(kbDir, "schema"), "not a directory\n");
    expect(() => createKbDirectoryStructure(kbDir, "main")).toThrow(
      `Refusing to initialize non-directory or symlink: ${path.join(kbDir, "schema")}`,
    );
    expect(existsSync(path.join(kbDir, "requirements"))).toBe(false);
  });

  test("refuses a branches directory that is a symlink", () => {
    const kbDir = path.join(root, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(root, "elsewhere"));
    symlinkSync(path.join(root, "elsewhere"), path.join(kbDir, "branches"));
    expect(() => createKbDirectoryStructure(kbDir, "main")).toThrow(
      `Refusing to initialize non-directory or symlink: ${path.join(kbDir, "branches")}`,
    );
    expect(logs).toEqual([]);
  });

  test("rethrows inspection errors other than a missing path", () => {
    const kbDir = path.join(root, ".kb");
    const failure = Object.assign(new Error("denied"), { code: "EACCES" });
    const lstat = spyOn(fs, "lstatSync").mockImplementation(() => {
      throw failure;
    });
    restores.push(() => lstat.mockRestore());
    expect(() => createKbDirectoryStructure(kbDir, "main")).toThrow(failure);
    expect(existsSync(kbDir)).toBe(false);
  });
});

describe("createManifestFile", () => {
  test("writes the lifecycle manifest", () => {
    const kbDir = path.join(root, ".kb");
    mkdirSync(kbDir);
    createManifestFile(kbDir);
    expect(existsSync(path.join(kbDir, "manifest.json"))).toBe(true);
    expect(logs).toEqual([
      "✓ Created Kibi lifecycle manifest at .kb/manifest.json",
    ]);
  });
});

describe("updateGitIgnore", () => {
  const gitignore = () => path.join(root, ".gitignore");
  const ENTRIES =
    ".kb/branches/\n.kb/recovery/\n.kb/proof/runs/\n.kb/briefs/\n.kb/migrations/\n.kb/symbol-coordinates.yaml\n.kb/usage.log\n.env.kibi\n";

  test("creates the file with every derived entry", () => {
    expect(updateGitIgnore(root)).toBe(true);
    expect(read(gitignore())).toBe(ENTRIES);
    expect(logs).toEqual([
      "✓ Configured .gitignore for the canonical .kb/ layout",
    ]);
  });

  test("leaves a complete file alone and reports no change", () => {
    const content = `\n\nnode_modules\n${ENTRIES.split("\n")
      .map((line) => `  ${line}  `)
      .join("\n")}\n\n`;
    writeFileSync(gitignore(), content);
    expect(updateGitIgnore(root)).toBe(false);
    expect(read(gitignore())).toBe(content);
    expect(logs).toEqual([]);
  });

  test("appends missing entries after trimming trailing blank lines only", () => {
    writeFileSync(gitignore(), "\n\nnode_modules\n.kb/usage.log\n\n\n");
    expect(updateGitIgnore(root)).toBe(true);
    expect(read(gitignore())).toBe(
      `\n\nnode_modules\n.kb/usage.log\n${ENTRIES.replace(".kb/usage.log\n", "")}`,
    );
  });

  test("keeps a lone fence or lone re-include that is not the legacy stanza", () => {
    writeFileSync(gitignore(), `.kb/\n${ENTRIES}`);
    expect(updateGitIgnore(root)).toBe(false);
    writeFileSync(gitignore(), `!.kb/schema/\n${ENTRIES}`);
    expect(updateGitIgnore(root)).toBe(false);
  });

  test("drops an indented legacy stanza and its trailing blank lines", () => {
    writeFileSync(
      gitignore(),
      `dist\n${ENTRIES}  .kb/  \n !.kb/config.json\n!.kb/relationships/*.yaml\n\n\n`,
    );
    expect(updateGitIgnore(root)).toBe(true);
    expect(read(gitignore())).toBe(`dist\n${ENTRIES}`);
  });

  test("keeps CRLF line endings out of a rewritten stanza", () => {
    writeFileSync(gitignore(), `.kb/\r\n!.kb/\r\n${ENTRIES}`);
    expect(updateGitIgnore(root)).toBe(true);
    expect(read(gitignore())).toBe(ENTRIES);
  });

  test("rewrites a file that held only the legacy stanza", () => {
    writeFileSync(gitignore(), ".kb/\n!.kb/schema/\n");
    expect(updateGitIgnore(root)).toBe(true);
    expect(read(gitignore())).toBe(ENTRIES);
  });
});

describe("ensureSymbolsManifestFile", () => {
  test("creates the manifest and its directory once", () => {
    ensureSymbolsManifestFile(root);
    const manifest = path.join(root, ".kb", "symbols.yaml");
    expect(read(manifest)).toEndWith("symbols: []\n");
    writeFileSync(manifest, "kept\n");
    ensureSymbolsManifestFile(root);
    expect(read(manifest)).toBe("kept\n");
    expect(logs).toEqual(["✓ Created .kb/symbols.yaml"]);
  });

  test("creates the manifest inside an existing .kb directory", () => {
    mkdirSync(path.join(root, ".kb"));
    ensureSymbolsManifestFile(root);
    expect(existsSync(path.join(root, ".kb", "symbols.yaml"))).toBe(true);
  });
});

describe("copySchemaFiles", () => {
  function schemaSource(): string {
    const source = path.join(root, "source");
    mkdirSync(source);
    writeFileSync(path.join(source, "a.pl"), "% a\n");
    writeFileSync(path.join(source, "b.pl"), "% b\n");
    writeFileSync(path.join(source, "notes.txt"), "skip\n");
    mkdirSync(path.join(root, ".kb", "schema"), { recursive: true });
    return source;
  }

  test("copies missing files and keeps existing ones", async () => {
    const source = schemaSource();
    const kbDir = path.join(root, ".kb");
    writeFileSync(path.join(kbDir, "schema", "a.pl"), "% local\n");
    await copySchemaFiles(kbDir, source);
    await copySchemaFiles(kbDir, source);
    expect(read(path.join(kbDir, "schema", "a.pl"))).toBe("% local\n");
    expect(read(path.join(kbDir, "schema", "b.pl"))).toBe("% b\n");
    expect(existsSync(path.join(kbDir, "schema", "notes.txt"))).toBe(false);
    expect(logs).toEqual([
      "✓ Ensured 2 schema files",
      "✓ Ensured 2 schema files",
    ]);
  });

  test("rethrows copy failures even when the destination exists", async () => {
    const source = schemaSource();
    const kbDir = path.join(root, ".kb");
    writeFileSync(path.join(kbDir, "schema", "a.pl"), "% local\n");
    const failure = Object.assign(new Error("denied"), { code: "EACCES" });
    const copy = spyOn(fs, "copyFileSync").mockImplementation(() => {
      throw failure;
    });
    restores.push(() => copy.mockRestore());
    await expect(copySchemaFiles(kbDir, source)).rejects.toThrow(failure);
  });
});

describe("isManagedHookName", () => {
  test("accepts only the hooks init manages", () => {
    expect(
      ["post-checkout", "post-merge", "post-rewrite", "pre-commit"].every(
        isManagedHookName,
      ),
    ).toBe(true);
    expect(isManagedHookName("pre-push")).toBe(false);
  });
});

describe("hookDelegationSnippet", () => {
  test("prints the pre-commit delegation", () => {
    expect(hookDelegationSnippet("pre-commit")).toMatchInlineSnapshot(`
      "# Kibi pre-commit delegation (printed by 'kibi init --print-hook pre-commit').
      # Paste into your existing pre-commit hook; it runs the same Kibi commands
      # as the Kibi-managed template.
      if ! command -v node >/dev/null 2>&1; then
        kibi_node_dir=""
        _kibi_pick_node() {
          kibi_suffix="$1"
          shift
          kibi_best_dir=""
          kibi_best_maj=-1
          kibi_best_min=-1
          kibi_best_pat=-1
          for kibi_cand in "$@"; do
            [ -f "$kibi_cand" ] && [ -x "$kibi_cand" ] || continue
            kibi_ver="\${kibi_cand%/$kibi_suffix}"
            kibi_ver="\${kibi_ver##*/}"
            kibi_ver="\${kibi_ver#v}"
            kibi_ver="\${kibi_ver%%-*}"
            kibi_maj="\${kibi_ver%%.*}"
            kibi_rest="\${kibi_ver#*.}"
            if [ "$kibi_rest" = "$kibi_ver" ]; then
              kibi_min=0
              kibi_pat=0
            else
              kibi_min="\${kibi_rest%%.*}"
              kibi_pat="\${kibi_rest#*.}"
              if [ "$kibi_pat" = "$kibi_rest" ]; then
                kibi_pat=0
              else
                kibi_pat="\${kibi_pat%%.*}"
              fi
            fi
            case "\${kibi_maj:-x}:\${kibi_min:-x}:\${kibi_pat:-x}" in
              *[!0-9:]*) continue ;;
            esac
            if [ "$kibi_maj" -gt "$kibi_best_maj" ] ||
               { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -gt "$kibi_best_min" ]; } ||
               { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -eq "$kibi_best_min" ] && [ "$kibi_pat" -gt "$kibi_best_pat" ]; }; then
              kibi_best_maj="$kibi_maj"
              kibi_best_min="$kibi_min"
              kibi_best_pat="$kibi_pat"
              kibi_best_dir="\${kibi_cand%/node}"
            fi
          done
          kibi_node_dir="$kibi_best_dir"
        }
        kibi_nvm_dir="\${NVM_DIR:-\${HOME:+$HOME/.nvm}}"
        if [ -n "$kibi_nvm_dir" ] && [ -d "$kibi_nvm_dir" ]; then
          if [ -f "$kibi_nvm_dir/current/bin/node" ] && [ -x "$kibi_nvm_dir/current/bin/node" ]; then
            kibi_node_dir="$kibi_nvm_dir/current/bin"
          fi
          if [ -z "$kibi_node_dir" ] && [ -f "$kibi_nvm_dir/alias/default" ] && [ -r "$kibi_nvm_dir/alias/default" ]; then
            kibi_alias=""
            read -r kibi_alias < "$kibi_nvm_dir/alias/default" || true
            kibi_hops=0
            while [ -n "$kibi_alias" ] && [ "$kibi_hops" -lt 5 ]; do
              case "$kibi_alias" in *..*|/*) break ;; esac
              if [ -f "$kibi_nvm_dir/alias/$kibi_alias" ] && [ -r "$kibi_nvm_dir/alias/$kibi_alias" ]; then
                kibi_next=""
                read -r kibi_next < "$kibi_nvm_dir/alias/$kibi_alias" || true
                kibi_alias="$kibi_next"
                kibi_hops=$((kibi_hops + 1))
              else
                break
              fi
            done
            case "\${kibi_alias#v}" in
              ""|*[!0-9.]*) ;;
              *)
                kibi_prefix="v\${kibi_alias#v}"
                if [ -f "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ] && [ -x "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ]; then
                  kibi_node_dir="$kibi_nvm_dir/versions/node/$kibi_prefix/bin"
                else
                  _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/"$kibi_prefix".*/bin/node
                fi
                ;;
            esac
          fi
          if [ -z "$kibi_node_dir" ]; then
            _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/*/bin/node
          fi
        fi
        if [ -z "$kibi_node_dir" ]; then
          kibi_volta_dir="\${VOLTA_HOME:-\${HOME:+$HOME/.volta}}"
          if [ -n "$kibi_volta_dir" ] && [ -f "$kibi_volta_dir/bin/node" ] && [ -x "$kibi_volta_dir/bin/node" ]; then
            kibi_node_dir="$kibi_volta_dir/bin"
          fi
        fi
        if [ -z "$kibi_node_dir" ]; then
          for kibi_fnm_dir in "\${FNM_DIR:-}" "\${XDG_DATA_HOME:+$XDG_DATA_HOME/fnm}" "\${HOME:+$HOME/.local/share/fnm}" "\${HOME:+$HOME/.fnm}"; do
            [ -n "$kibi_fnm_dir" ] || continue
            if [ -f "$kibi_fnm_dir/aliases/default/bin/node" ] && [ -x "$kibi_fnm_dir/aliases/default/bin/node" ]; then
              kibi_node_dir="$kibi_fnm_dir/aliases/default/bin"
              break
            fi
            if [ -d "$kibi_fnm_dir/node-versions" ]; then
              _kibi_pick_node "installation/bin/node" "$kibi_fnm_dir"/node-versions/*/installation/bin/node
              if [ -n "$kibi_node_dir" ]; then
                break
              fi
            fi
          done
        fi
        if [ -z "$kibi_node_dir" ]; then
          kibi_asdf_dir="\${ASDF_DATA_DIR:-\${HOME:+$HOME/.asdf}}"
          kibi_mise_dir="\${MISE_DATA_DIR:-\${XDG_DATA_HOME:+$XDG_DATA_HOME/mise}}"
          if [ -z "$kibi_mise_dir" ] && [ -n "\${HOME:-}" ]; then
            kibi_mise_dir="$HOME/.local/share/mise"
          fi
          for kibi_cand_dir in "\${kibi_asdf_dir:+$kibi_asdf_dir/shims}" "\${kibi_mise_dir:+$kibi_mise_dir/shims}" "/opt/homebrew/bin" "/usr/local/bin"; do
            if [ -n "$kibi_cand_dir" ] && [ -f "$kibi_cand_dir/node" ] && [ -x "$kibi_cand_dir/node" ]; then
              kibi_node_dir="$kibi_cand_dir"
              break
            fi
          done
        fi
        unset -f _kibi_pick_node 2>/dev/null || true
        if [ -n "$kibi_node_dir" ]; then
          PATH="\${kibi_node_dir}\${PATH:+:$PATH}"
          export PATH
        fi
      fi
      if ! command -v node >/dev/null 2>&1; then
        echo "kibi: cannot locate 'node' on PATH or in standard version-manager locations (nvm, volta, fnm, asdf, mise, /opt/homebrew/bin, /usr/local/bin)." >&2
        echo "Ensure Node.js is on PATH for Git hooks, and run 'kibi sync' from your shell so the branch store is not left stale." >&2
        exit 1
      fi
      KIBI_BIN="$(command -v kibi 2>/dev/null || true)"
      if [ -z "$KIBI_BIN" ]; then
        kibi_dir="$PWD"
        while [ -n "$kibi_dir" ] && [ "$kibi_dir" != "/" ]; do
          if [ -x "$kibi_dir/node_modules/.bin/kibi" ]; then
            KIBI_BIN="$kibi_dir/node_modules/.bin/kibi"
            break
          fi
          kibi_parent="\${kibi_dir%/*}"
          if [ -z "$kibi_parent" ]; then
            kibi_parent="/"
          fi
          kibi_dir="$kibi_parent"
        done
      fi
      if [ -z "$KIBI_BIN" ]; then
        echo "kibi: cannot locate the kibi CLI (checked PATH and node_modules/.bin)." >&2
        echo "Install kibi globally or as a project dependency, then re-run 'kibi init'." >&2
        exit 1
      fi
      "$KIBI_BIN" check-generated --staged --changed-only || exit $?
      "$KIBI_BIN" check --staged || exit $?
      "
    `);
  });

  test("guards post-checkout and post-rewrite with an indented body", () => {
    expect(hookDelegationSnippet("post-checkout")).toMatchInlineSnapshot(`
      "# Kibi post-checkout delegation (printed by 'kibi init --print-hook post-checkout').
      # Paste into your existing post-checkout hook; it runs the same Kibi commands
      # as the Kibi-managed template.
      if [ "$3" = "1" ]; then
        if ! command -v node >/dev/null 2>&1; then
          kibi_node_dir=""
          _kibi_pick_node() {
            kibi_suffix="$1"
            shift
            kibi_best_dir=""
            kibi_best_maj=-1
            kibi_best_min=-1
            kibi_best_pat=-1
            for kibi_cand in "$@"; do
              [ -f "$kibi_cand" ] && [ -x "$kibi_cand" ] || continue
              kibi_ver="\${kibi_cand%/$kibi_suffix}"
              kibi_ver="\${kibi_ver##*/}"
              kibi_ver="\${kibi_ver#v}"
              kibi_ver="\${kibi_ver%%-*}"
              kibi_maj="\${kibi_ver%%.*}"
              kibi_rest="\${kibi_ver#*.}"
              if [ "$kibi_rest" = "$kibi_ver" ]; then
                kibi_min=0
                kibi_pat=0
              else
                kibi_min="\${kibi_rest%%.*}"
                kibi_pat="\${kibi_rest#*.}"
                if [ "$kibi_pat" = "$kibi_rest" ]; then
                  kibi_pat=0
                else
                  kibi_pat="\${kibi_pat%%.*}"
                fi
              fi
              case "\${kibi_maj:-x}:\${kibi_min:-x}:\${kibi_pat:-x}" in
                *[!0-9:]*) continue ;;
              esac
              if [ "$kibi_maj" -gt "$kibi_best_maj" ] ||
                 { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -gt "$kibi_best_min" ]; } ||
                 { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -eq "$kibi_best_min" ] && [ "$kibi_pat" -gt "$kibi_best_pat" ]; }; then
                kibi_best_maj="$kibi_maj"
                kibi_best_min="$kibi_min"
                kibi_best_pat="$kibi_pat"
                kibi_best_dir="\${kibi_cand%/node}"
              fi
            done
            kibi_node_dir="$kibi_best_dir"
          }
          kibi_nvm_dir="\${NVM_DIR:-\${HOME:+$HOME/.nvm}}"
          if [ -n "$kibi_nvm_dir" ] && [ -d "$kibi_nvm_dir" ]; then
            if [ -f "$kibi_nvm_dir/current/bin/node" ] && [ -x "$kibi_nvm_dir/current/bin/node" ]; then
              kibi_node_dir="$kibi_nvm_dir/current/bin"
            fi
            if [ -z "$kibi_node_dir" ] && [ -f "$kibi_nvm_dir/alias/default" ] && [ -r "$kibi_nvm_dir/alias/default" ]; then
              kibi_alias=""
              read -r kibi_alias < "$kibi_nvm_dir/alias/default" || true
              kibi_hops=0
              while [ -n "$kibi_alias" ] && [ "$kibi_hops" -lt 5 ]; do
                case "$kibi_alias" in *..*|/*) break ;; esac
                if [ -f "$kibi_nvm_dir/alias/$kibi_alias" ] && [ -r "$kibi_nvm_dir/alias/$kibi_alias" ]; then
                  kibi_next=""
                  read -r kibi_next < "$kibi_nvm_dir/alias/$kibi_alias" || true
                  kibi_alias="$kibi_next"
                  kibi_hops=$((kibi_hops + 1))
                else
                  break
                fi
              done
              case "\${kibi_alias#v}" in
                ""|*[!0-9.]*) ;;
                *)
                  kibi_prefix="v\${kibi_alias#v}"
                  if [ -f "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ] && [ -x "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ]; then
                    kibi_node_dir="$kibi_nvm_dir/versions/node/$kibi_prefix/bin"
                  else
                    _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/"$kibi_prefix".*/bin/node
                  fi
                  ;;
              esac
            fi
            if [ -z "$kibi_node_dir" ]; then
              _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/*/bin/node
            fi
          fi
          if [ -z "$kibi_node_dir" ]; then
            kibi_volta_dir="\${VOLTA_HOME:-\${HOME:+$HOME/.volta}}"
            if [ -n "$kibi_volta_dir" ] && [ -f "$kibi_volta_dir/bin/node" ] && [ -x "$kibi_volta_dir/bin/node" ]; then
              kibi_node_dir="$kibi_volta_dir/bin"
            fi
          fi
          if [ -z "$kibi_node_dir" ]; then
            for kibi_fnm_dir in "\${FNM_DIR:-}" "\${XDG_DATA_HOME:+$XDG_DATA_HOME/fnm}" "\${HOME:+$HOME/.local/share/fnm}" "\${HOME:+$HOME/.fnm}"; do
              [ -n "$kibi_fnm_dir" ] || continue
              if [ -f "$kibi_fnm_dir/aliases/default/bin/node" ] && [ -x "$kibi_fnm_dir/aliases/default/bin/node" ]; then
                kibi_node_dir="$kibi_fnm_dir/aliases/default/bin"
                break
              fi
              if [ -d "$kibi_fnm_dir/node-versions" ]; then
                _kibi_pick_node "installation/bin/node" "$kibi_fnm_dir"/node-versions/*/installation/bin/node
                if [ -n "$kibi_node_dir" ]; then
                  break
                fi
              fi
            done
          fi
          if [ -z "$kibi_node_dir" ]; then
            kibi_asdf_dir="\${ASDF_DATA_DIR:-\${HOME:+$HOME/.asdf}}"
            kibi_mise_dir="\${MISE_DATA_DIR:-\${XDG_DATA_HOME:+$XDG_DATA_HOME/mise}}"
            if [ -z "$kibi_mise_dir" ] && [ -n "\${HOME:-}" ]; then
              kibi_mise_dir="$HOME/.local/share/mise"
            fi
            for kibi_cand_dir in "\${kibi_asdf_dir:+$kibi_asdf_dir/shims}" "\${kibi_mise_dir:+$kibi_mise_dir/shims}" "/opt/homebrew/bin" "/usr/local/bin"; do
              if [ -n "$kibi_cand_dir" ] && [ -f "$kibi_cand_dir/node" ] && [ -x "$kibi_cand_dir/node" ]; then
                kibi_node_dir="$kibi_cand_dir"
                break
              fi
            done
          fi
          unset -f _kibi_pick_node 2>/dev/null || true
          if [ -n "$kibi_node_dir" ]; then
            PATH="\${kibi_node_dir}\${PATH:+:$PATH}"
            export PATH
          fi
        fi
        if ! command -v node >/dev/null 2>&1; then
          echo "kibi: cannot locate 'node' on PATH or in standard version-manager locations (nvm, volta, fnm, asdf, mise, /opt/homebrew/bin, /usr/local/bin)." >&2
          echo "Ensure Node.js is on PATH for Git hooks, and run 'kibi sync' from your shell so the branch store is not left stale." >&2
          exit 1
        fi
        KIBI_BIN="$(command -v kibi 2>/dev/null || true)"
        if [ -z "$KIBI_BIN" ]; then
          kibi_dir="$PWD"
          while [ -n "$kibi_dir" ] && [ "$kibi_dir" != "/" ]; do
            if [ -x "$kibi_dir/node_modules/.bin/kibi" ]; then
              KIBI_BIN="$kibi_dir/node_modules/.bin/kibi"
              break
            fi
            kibi_parent="\${kibi_dir%/*}"
            if [ -z "$kibi_parent" ]; then
              kibi_parent="/"
            fi
            kibi_dir="$kibi_parent"
          done
        fi
        if [ -z "$KIBI_BIN" ]; then
          echo "kibi: cannot locate the kibi CLI (checked PATH and node_modules/.bin)." >&2
          echo "Install kibi globally or as a project dependency, then re-run 'kibi init'." >&2
          exit 1
        fi
        "$KIBI_BIN" sync
      fi
      "
    `);
    expect(hookDelegationSnippet("post-rewrite")).toMatchInlineSnapshot(`
      "# Kibi post-rewrite delegation (printed by 'kibi init --print-hook post-rewrite').
      # Paste into your existing post-rewrite hook; it runs the same Kibi commands
      # as the Kibi-managed template.
      if [ "$1" = "rebase" ]; then
        if ! command -v node >/dev/null 2>&1; then
          kibi_node_dir=""
          _kibi_pick_node() {
            kibi_suffix="$1"
            shift
            kibi_best_dir=""
            kibi_best_maj=-1
            kibi_best_min=-1
            kibi_best_pat=-1
            for kibi_cand in "$@"; do
              [ -f "$kibi_cand" ] && [ -x "$kibi_cand" ] || continue
              kibi_ver="\${kibi_cand%/$kibi_suffix}"
              kibi_ver="\${kibi_ver##*/}"
              kibi_ver="\${kibi_ver#v}"
              kibi_ver="\${kibi_ver%%-*}"
              kibi_maj="\${kibi_ver%%.*}"
              kibi_rest="\${kibi_ver#*.}"
              if [ "$kibi_rest" = "$kibi_ver" ]; then
                kibi_min=0
                kibi_pat=0
              else
                kibi_min="\${kibi_rest%%.*}"
                kibi_pat="\${kibi_rest#*.}"
                if [ "$kibi_pat" = "$kibi_rest" ]; then
                  kibi_pat=0
                else
                  kibi_pat="\${kibi_pat%%.*}"
                fi
              fi
              case "\${kibi_maj:-x}:\${kibi_min:-x}:\${kibi_pat:-x}" in
                *[!0-9:]*) continue ;;
              esac
              if [ "$kibi_maj" -gt "$kibi_best_maj" ] ||
                 { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -gt "$kibi_best_min" ]; } ||
                 { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -eq "$kibi_best_min" ] && [ "$kibi_pat" -gt "$kibi_best_pat" ]; }; then
                kibi_best_maj="$kibi_maj"
                kibi_best_min="$kibi_min"
                kibi_best_pat="$kibi_pat"
                kibi_best_dir="\${kibi_cand%/node}"
              fi
            done
            kibi_node_dir="$kibi_best_dir"
          }
          kibi_nvm_dir="\${NVM_DIR:-\${HOME:+$HOME/.nvm}}"
          if [ -n "$kibi_nvm_dir" ] && [ -d "$kibi_nvm_dir" ]; then
            if [ -f "$kibi_nvm_dir/current/bin/node" ] && [ -x "$kibi_nvm_dir/current/bin/node" ]; then
              kibi_node_dir="$kibi_nvm_dir/current/bin"
            fi
            if [ -z "$kibi_node_dir" ] && [ -f "$kibi_nvm_dir/alias/default" ] && [ -r "$kibi_nvm_dir/alias/default" ]; then
              kibi_alias=""
              read -r kibi_alias < "$kibi_nvm_dir/alias/default" || true
              kibi_hops=0
              while [ -n "$kibi_alias" ] && [ "$kibi_hops" -lt 5 ]; do
                case "$kibi_alias" in *..*|/*) break ;; esac
                if [ -f "$kibi_nvm_dir/alias/$kibi_alias" ] && [ -r "$kibi_nvm_dir/alias/$kibi_alias" ]; then
                  kibi_next=""
                  read -r kibi_next < "$kibi_nvm_dir/alias/$kibi_alias" || true
                  kibi_alias="$kibi_next"
                  kibi_hops=$((kibi_hops + 1))
                else
                  break
                fi
              done
              case "\${kibi_alias#v}" in
                ""|*[!0-9.]*) ;;
                *)
                  kibi_prefix="v\${kibi_alias#v}"
                  if [ -f "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ] && [ -x "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ]; then
                    kibi_node_dir="$kibi_nvm_dir/versions/node/$kibi_prefix/bin"
                  else
                    _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/"$kibi_prefix".*/bin/node
                  fi
                  ;;
              esac
            fi
            if [ -z "$kibi_node_dir" ]; then
              _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/*/bin/node
            fi
          fi
          if [ -z "$kibi_node_dir" ]; then
            kibi_volta_dir="\${VOLTA_HOME:-\${HOME:+$HOME/.volta}}"
            if [ -n "$kibi_volta_dir" ] && [ -f "$kibi_volta_dir/bin/node" ] && [ -x "$kibi_volta_dir/bin/node" ]; then
              kibi_node_dir="$kibi_volta_dir/bin"
            fi
          fi
          if [ -z "$kibi_node_dir" ]; then
            for kibi_fnm_dir in "\${FNM_DIR:-}" "\${XDG_DATA_HOME:+$XDG_DATA_HOME/fnm}" "\${HOME:+$HOME/.local/share/fnm}" "\${HOME:+$HOME/.fnm}"; do
              [ -n "$kibi_fnm_dir" ] || continue
              if [ -f "$kibi_fnm_dir/aliases/default/bin/node" ] && [ -x "$kibi_fnm_dir/aliases/default/bin/node" ]; then
                kibi_node_dir="$kibi_fnm_dir/aliases/default/bin"
                break
              fi
              if [ -d "$kibi_fnm_dir/node-versions" ]; then
                _kibi_pick_node "installation/bin/node" "$kibi_fnm_dir"/node-versions/*/installation/bin/node
                if [ -n "$kibi_node_dir" ]; then
                  break
                fi
              fi
            done
          fi
          if [ -z "$kibi_node_dir" ]; then
            kibi_asdf_dir="\${ASDF_DATA_DIR:-\${HOME:+$HOME/.asdf}}"
            kibi_mise_dir="\${MISE_DATA_DIR:-\${XDG_DATA_HOME:+$XDG_DATA_HOME/mise}}"
            if [ -z "$kibi_mise_dir" ] && [ -n "\${HOME:-}" ]; then
              kibi_mise_dir="$HOME/.local/share/mise"
            fi
            for kibi_cand_dir in "\${kibi_asdf_dir:+$kibi_asdf_dir/shims}" "\${kibi_mise_dir:+$kibi_mise_dir/shims}" "/opt/homebrew/bin" "/usr/local/bin"; do
              if [ -n "$kibi_cand_dir" ] && [ -f "$kibi_cand_dir/node" ] && [ -x "$kibi_cand_dir/node" ]; then
                kibi_node_dir="$kibi_cand_dir"
                break
              fi
            done
          fi
          unset -f _kibi_pick_node 2>/dev/null || true
          if [ -n "$kibi_node_dir" ]; then
            PATH="\${kibi_node_dir}\${PATH:+:$PATH}"
            export PATH
          fi
        fi
        if ! command -v node >/dev/null 2>&1; then
          echo "kibi: cannot locate 'node' on PATH or in standard version-manager locations (nvm, volta, fnm, asdf, mise, /opt/homebrew/bin, /usr/local/bin)." >&2
          echo "Ensure Node.js is on PATH for Git hooks, and run 'kibi sync' from your shell so the branch store is not left stale." >&2
          exit 1
        fi
        KIBI_BIN="$(command -v kibi 2>/dev/null || true)"
        if [ -z "$KIBI_BIN" ]; then
          kibi_dir="$PWD"
          while [ -n "$kibi_dir" ] && [ "$kibi_dir" != "/" ]; do
            if [ -x "$kibi_dir/node_modules/.bin/kibi" ]; then
              KIBI_BIN="$kibi_dir/node_modules/.bin/kibi"
              break
            fi
            kibi_parent="\${kibi_dir%/*}"
            if [ -z "$kibi_parent" ]; then
              kibi_parent="/"
            fi
            kibi_dir="$kibi_parent"
          done
        fi
        if [ -z "$KIBI_BIN" ]; then
          echo "kibi: cannot locate the kibi CLI (checked PATH and node_modules/.bin)." >&2
          echo "Install kibi globally or as a project dependency, then re-run 'kibi init'." >&2
          exit 1
        fi
        "$KIBI_BIN" sync
      fi
      "
    `);
  });

  test("prints the post-merge delegation", () => {
    expect(hookDelegationSnippet("post-merge")).toMatchInlineSnapshot(`
      "# Kibi post-merge delegation (printed by 'kibi init --print-hook post-merge').
      # Paste into your existing post-merge hook; it runs the same Kibi commands
      # as the Kibi-managed template.
      if ! command -v node >/dev/null 2>&1; then
        kibi_node_dir=""
        _kibi_pick_node() {
          kibi_suffix="$1"
          shift
          kibi_best_dir=""
          kibi_best_maj=-1
          kibi_best_min=-1
          kibi_best_pat=-1
          for kibi_cand in "$@"; do
            [ -f "$kibi_cand" ] && [ -x "$kibi_cand" ] || continue
            kibi_ver="\${kibi_cand%/$kibi_suffix}"
            kibi_ver="\${kibi_ver##*/}"
            kibi_ver="\${kibi_ver#v}"
            kibi_ver="\${kibi_ver%%-*}"
            kibi_maj="\${kibi_ver%%.*}"
            kibi_rest="\${kibi_ver#*.}"
            if [ "$kibi_rest" = "$kibi_ver" ]; then
              kibi_min=0
              kibi_pat=0
            else
              kibi_min="\${kibi_rest%%.*}"
              kibi_pat="\${kibi_rest#*.}"
              if [ "$kibi_pat" = "$kibi_rest" ]; then
                kibi_pat=0
              else
                kibi_pat="\${kibi_pat%%.*}"
              fi
            fi
            case "\${kibi_maj:-x}:\${kibi_min:-x}:\${kibi_pat:-x}" in
              *[!0-9:]*) continue ;;
            esac
            if [ "$kibi_maj" -gt "$kibi_best_maj" ] ||
               { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -gt "$kibi_best_min" ]; } ||
               { [ "$kibi_maj" -eq "$kibi_best_maj" ] && [ "$kibi_min" -eq "$kibi_best_min" ] && [ "$kibi_pat" -gt "$kibi_best_pat" ]; }; then
              kibi_best_maj="$kibi_maj"
              kibi_best_min="$kibi_min"
              kibi_best_pat="$kibi_pat"
              kibi_best_dir="\${kibi_cand%/node}"
            fi
          done
          kibi_node_dir="$kibi_best_dir"
        }
        kibi_nvm_dir="\${NVM_DIR:-\${HOME:+$HOME/.nvm}}"
        if [ -n "$kibi_nvm_dir" ] && [ -d "$kibi_nvm_dir" ]; then
          if [ -f "$kibi_nvm_dir/current/bin/node" ] && [ -x "$kibi_nvm_dir/current/bin/node" ]; then
            kibi_node_dir="$kibi_nvm_dir/current/bin"
          fi
          if [ -z "$kibi_node_dir" ] && [ -f "$kibi_nvm_dir/alias/default" ] && [ -r "$kibi_nvm_dir/alias/default" ]; then
            kibi_alias=""
            read -r kibi_alias < "$kibi_nvm_dir/alias/default" || true
            kibi_hops=0
            while [ -n "$kibi_alias" ] && [ "$kibi_hops" -lt 5 ]; do
              case "$kibi_alias" in *..*|/*) break ;; esac
              if [ -f "$kibi_nvm_dir/alias/$kibi_alias" ] && [ -r "$kibi_nvm_dir/alias/$kibi_alias" ]; then
                kibi_next=""
                read -r kibi_next < "$kibi_nvm_dir/alias/$kibi_alias" || true
                kibi_alias="$kibi_next"
                kibi_hops=$((kibi_hops + 1))
              else
                break
              fi
            done
            case "\${kibi_alias#v}" in
              ""|*[!0-9.]*) ;;
              *)
                kibi_prefix="v\${kibi_alias#v}"
                if [ -f "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ] && [ -x "$kibi_nvm_dir/versions/node/$kibi_prefix/bin/node" ]; then
                  kibi_node_dir="$kibi_nvm_dir/versions/node/$kibi_prefix/bin"
                else
                  _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/"$kibi_prefix".*/bin/node
                fi
                ;;
            esac
          fi
          if [ -z "$kibi_node_dir" ]; then
            _kibi_pick_node "bin/node" "$kibi_nvm_dir"/versions/node/*/bin/node
          fi
        fi
        if [ -z "$kibi_node_dir" ]; then
          kibi_volta_dir="\${VOLTA_HOME:-\${HOME:+$HOME/.volta}}"
          if [ -n "$kibi_volta_dir" ] && [ -f "$kibi_volta_dir/bin/node" ] && [ -x "$kibi_volta_dir/bin/node" ]; then
            kibi_node_dir="$kibi_volta_dir/bin"
          fi
        fi
        if [ -z "$kibi_node_dir" ]; then
          for kibi_fnm_dir in "\${FNM_DIR:-}" "\${XDG_DATA_HOME:+$XDG_DATA_HOME/fnm}" "\${HOME:+$HOME/.local/share/fnm}" "\${HOME:+$HOME/.fnm}"; do
            [ -n "$kibi_fnm_dir" ] || continue
            if [ -f "$kibi_fnm_dir/aliases/default/bin/node" ] && [ -x "$kibi_fnm_dir/aliases/default/bin/node" ]; then
              kibi_node_dir="$kibi_fnm_dir/aliases/default/bin"
              break
            fi
            if [ -d "$kibi_fnm_dir/node-versions" ]; then
              _kibi_pick_node "installation/bin/node" "$kibi_fnm_dir"/node-versions/*/installation/bin/node
              if [ -n "$kibi_node_dir" ]; then
                break
              fi
            fi
          done
        fi
        if [ -z "$kibi_node_dir" ]; then
          kibi_asdf_dir="\${ASDF_DATA_DIR:-\${HOME:+$HOME/.asdf}}"
          kibi_mise_dir="\${MISE_DATA_DIR:-\${XDG_DATA_HOME:+$XDG_DATA_HOME/mise}}"
          if [ -z "$kibi_mise_dir" ] && [ -n "\${HOME:-}" ]; then
            kibi_mise_dir="$HOME/.local/share/mise"
          fi
          for kibi_cand_dir in "\${kibi_asdf_dir:+$kibi_asdf_dir/shims}" "\${kibi_mise_dir:+$kibi_mise_dir/shims}" "/opt/homebrew/bin" "/usr/local/bin"; do
            if [ -n "$kibi_cand_dir" ] && [ -f "$kibi_cand_dir/node" ] && [ -x "$kibi_cand_dir/node" ]; then
              kibi_node_dir="$kibi_cand_dir"
              break
            fi
          done
        fi
        unset -f _kibi_pick_node 2>/dev/null || true
        if [ -n "$kibi_node_dir" ]; then
          PATH="\${kibi_node_dir}\${PATH:+:$PATH}"
          export PATH
        fi
      fi
      if ! command -v node >/dev/null 2>&1; then
        echo "kibi: cannot locate 'node' on PATH or in standard version-manager locations (nvm, volta, fnm, asdf, mise, /opt/homebrew/bin, /usr/local/bin)." >&2
        echo "Ensure Node.js is on PATH for Git hooks, and run 'kibi sync' from your shell so the branch store is not left stale." >&2
        exit 1
      fi
      KIBI_BIN="$(command -v kibi 2>/dev/null || true)"
      if [ -z "$KIBI_BIN" ]; then
        kibi_dir="$PWD"
        while [ -n "$kibi_dir" ] && [ "$kibi_dir" != "/" ]; do
          if [ -x "$kibi_dir/node_modules/.bin/kibi" ]; then
            KIBI_BIN="$kibi_dir/node_modules/.bin/kibi"
            break
          fi
          kibi_parent="\${kibi_dir%/*}"
          if [ -z "$kibi_parent" ]; then
            kibi_parent="/"
          fi
          kibi_dir="$kibi_parent"
        done
      fi
      if [ -z "$KIBI_BIN" ]; then
        echo "kibi: cannot locate the kibi CLI (checked PATH and node_modules/.bin)." >&2
        echo "Install kibi globally or as a project dependency, then re-run 'kibi init'." >&2
        exit 1
      fi
      "$KIBI_BIN" sync
      "
    `);
  });
});

describe("installHook", () => {
  const BODY = 'echo "kibi sync"';
  const SECTION = `${KIBI_HOOK_BEGIN}\n${BODY}\n# END kibi-managed`;

  test("creates a missing hook as an executable script", () => {
    const hook = path.join(root, "post-merge");
    expect(installHook(hook, BODY)).toBe("installed");
    expect(read(hook)).toBe(`#!/bin/sh\n${SECTION}\n`);
    expect(isExecutable(hook)).toBe(true);
  });

  test("fills a whitespace-only hook", () => {
    const hook = path.join(root, "post-merge");
    writeFileSync(hook, "  \n\n", { mode: 0o600 });
    expect(installHook(hook, BODY)).toBe("installed");
    expect(read(hook)).toBe(`#!/bin/sh\n\n${SECTION}\n`);
    expect(isExecutable(hook)).toBe(true);
  });

  test("replaces only the managed section and restores the mode", () => {
    const hook = path.join(root, "post-merge");
    writeFileSync(
      hook,
      `#!/bin/sh\necho before\n${KIBI_HOOK_BEGIN}\nold\n# END kibi-managed\necho after\n`,
      { mode: 0o600 },
    );
    expect(installHook(hook, BODY)).toBe("updated");
    expect(read(hook)).toBe(`#!/bin/sh\necho before\n${SECTION}\necho after\n`);
    expect(isExecutable(hook)).toBe(true);
  });

  test("treats a hook with only the begin marker as foreign", () => {
    const hook = path.join(root, "post-merge");
    const content = `#!/bin/sh\n${KIBI_HOOK_BEGIN}\necho mine\n`;
    writeFileSync(hook, content);
    expect(installHook(hook, BODY)).toBe("skipped-foreign");
    expect(read(hook)).toBe(content);
  });

  test("skips a directory without reading it", () => {
    const hook = path.join(root, "post-merge");
    mkdirSync(hook);
    expect(installHook(hook, BODY)).toBe("skipped-unsupported");
    expect(errors).toEqual([]);
  });

  test("reports a hook path below a regular file", () => {
    writeFileSync(path.join(root, "file"), "");
    const hook = path.join(root, "file", "post-merge");
    expect(installHook(hook, BODY)).toBe("skipped-unsupported");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toStartWith(`! Unable to inspect ${hook}: `);
    expect(errors[0]).toEndWith("; leaving it untouched.");
  });

  test("reports a hook that cannot be read", () => {
    const hook = path.join(root, "post-merge");
    writeFileSync(hook, "#!/bin/sh\n");
    const readFile = spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("denied");
    });
    restores.push(() => readFile.mockRestore());
    expect(installHook(hook, BODY)).toBe("skipped-unsupported");
    expect(errors).toEqual([
      `! Unable to read ${hook}: denied; leaving it untouched.`,
    ]);
  });
});

describe("installGitHooks", () => {
  const hooksDir = () => path.join(root, "hooks");

  test("installs every template without a shebang inside the section", () => {
    const results = installGitHooks(hooksDir());
    expect(results).toEqual([
      { hook: "post-checkout", result: "installed" },
      { hook: "post-merge", result: "installed" },
      { hook: "post-rewrite", result: "installed" },
      { hook: "pre-commit", result: "installed" },
    ]);
    expect(read(path.join(hooksDir(), "post-merge"))).toStartWith(
      `#!/bin/sh\n${KIBI_HOOK_BEGIN}\n# post-merge hook for kibi\n`,
    );
    expect(logs).toEqual([
      `✓ Installed/updated Kibi git hooks at ${hooksDir()} (post-checkout, post-merge, post-rewrite, pre-commit)`,
    ]);
    expect(hasManagedHooks(hooksDir())).toBe(true);
    expect(outdatedManagedHooks(hooksDir())).toEqual([]);
  });

  test("explains each skipped hook and the hooks path", () => {
    mkdirSync(hooksDir());
    writeFileSync(path.join(hooksDir(), "post-checkout"), "echo mine\n");
    symlinkSync(
      path.join(root, "target"),
      path.join(hooksDir(), "post-rewrite"),
    );
    mkdirSync(path.join(hooksDir(), "pre-commit"));
    writeFileSync(path.join(hooksDir(), "post-merge"), "echo mine\n");
    const results = installGitHooks(hooksDir(), {
      hooksPathOrigin: "local config",
    });
    expect(results.map((entry) => entry.result)).toEqual([
      "skipped-foreign",
      "skipped-foreign",
      "skipped-symlink",
      "skipped-unsupported",
    ]);
    expect(logs).toEqual([
      "! post-checkout: existing non-Kibi hook left untouched; Kibi enforcement is NOT installed for this hook. To integrate: delegate from that hook to 'kibi sync' on branch checkouts (the template skips file checkouts); print a copy-paste snippet that resolves a project-local kibi with 'kibi init --print-hook post-checkout'.",
      "! post-merge: existing non-Kibi hook left untouched; Kibi enforcement is NOT installed for this hook. To integrate: delegate from that hook to 'kibi sync'; print a copy-paste snippet that resolves a project-local kibi with 'kibi init --print-hook post-merge'.",
      "! post-rewrite: hook is a symlink; Kibi never edits symlink targets. Manage the target manually (delegate from that hook to 'kibi sync' after rebase rewrites; print a copy-paste snippet that resolves a project-local kibi with 'kibi init --print-hook post-rewrite').",
      "! pre-commit: hook path is not a regular file; left untouched.",
      `! No Kibi git hooks installed at ${hooksDir()} (all hooks were skipped).`,
      `! core.hooksPath is configured (local config); the effective hooks directory for THIS checkout is ${hooksDir()}. Git resolves a relative hooks path separately under every worktree, so coverage of other worktrees is INCOMPLETE/UNVERIFIED: commit a versioned launcher that delegates to kibi, or run 'kibi init' in each checkout. Kibi will not change core.hooksPath.`,
    ]);
  });

  test("sends every note to the given log instead of the console", () => {
    mkdirSync(hooksDir());
    writeFileSync(path.join(hooksDir(), "post-checkout"), "echo mine\n");
    symlinkSync(
      path.join(root, "target"),
      path.join(hooksDir(), "post-rewrite"),
    );
    mkdirSync(path.join(hooksDir(), "pre-commit"));
    const notes: string[] = [];
    installGitHooks(hooksDir(), {
      hooksPathOrigin: "local config",
      log: (message) => notes.push(message),
    });
    expect(logs).toEqual([]);
    expect(notes.map((note) => note.slice(0, 16))).toEqual([
      "! post-checkout:",
      "! post-rewrite: ",
      "! pre-commit: ho",
      "✓ Installed/upda",
      "! core.hooksPath",
    ]);
    const quiet: string[] = [];
    installGitHooks(hooksDir(), { log: (message) => quiet.push(message) });
    expect(quiet.at(-1)).toBe(
      `✓ Installed/updated Kibi git hooks at ${hooksDir()} (post-merge)`,
    );
    expect(logs).toEqual([]);
  });

  test("names the pre-commit checks for a foreign pre-commit hook", () => {
    mkdirSync(hooksDir());
    writeFileSync(path.join(hooksDir(), "pre-commit"), "echo mine\n");
    installGitHooks(hooksDir(), { hooksPathOrigin: "" });
    expect(logs).toEqual([
      "! pre-commit: existing non-Kibi hook left untouched; Kibi enforcement is NOT installed for this hook. To integrate: delegate from that hook to both 'kibi check-generated --staged --changed-only' and 'kibi check --staged' (both must succeed); print a copy-paste snippet that resolves a project-local kibi with 'kibi init --print-hook pre-commit'.",
      `✓ Installed/updated Kibi git hooks at ${hooksDir()} (post-checkout, post-merge, post-rewrite)`,
    ]);
  });
});

describe("managed hook inspection", () => {
  const hooksDir = () => path.join(root, "hooks");

  test("finds nothing in an empty or foreign hooks directory", () => {
    mkdirSync(hooksDir());
    expect(hasManagedHooks(hooksDir())).toBe(false);
    expect(outdatedManagedHooks(hooksDir())).toEqual([]);
    writeFileSync(path.join(hooksDir(), "pre-commit"), "echo mine\n");
    writeFileSync(path.join(hooksDir(), "pre-push"), `${KIBI_HOOK_BEGIN}\n`);
    expect(hasManagedHooks(hooksDir())).toBe(false);
    expect(outdatedManagedHooks(hooksDir())).toEqual([]);
  });

  test("finds a managed section in the last hook and reports it outdated", () => {
    mkdirSync(hooksDir());
    writeFileSync(
      path.join(hooksDir(), "pre-commit"),
      `#!/bin/sh\n${KIBI_HOOK_BEGIN}\nkibi check --staged\n# END kibi-managed\n`,
    );
    expect(hasManagedHooks(hooksDir())).toBe(true);
    expect(outdatedManagedHooks(hooksDir())).toEqual(["pre-commit"]);
  });
});
