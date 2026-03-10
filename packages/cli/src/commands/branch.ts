/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export async function branchEnsureCommand(): Promise<void> {
  const branch = execSync("git branch --show-current", {
    encoding: "utf-8",
  }).trim();
  const kbPath = path.join(process.cwd(), ".kb/branches", branch);
  const templateCandidates = ["develop", "main"];
  const templateBranch = templateCandidates.find((candidate) =>
    fs.existsSync(path.join(process.cwd(), ".kb/branches", candidate)),
  );

  if (!templateBranch) {
    console.warn(
      "Warning: no template branch KB exists, skipping branch ensure",
    );
    return;
  }

  if (!fs.existsSync(kbPath)) {
    const templatePath = path.join(
      process.cwd(),
      ".kb/branches",
      templateBranch,
    );
    fs.cpSync(templatePath, kbPath, { recursive: true });
    console.log(`Created branch KB: ${branch}`);
  } else {
    console.log(`Branch KB already exists: ${branch}`);
  }
}

export default branchEnsureCommand;
