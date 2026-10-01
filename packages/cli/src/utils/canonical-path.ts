import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";

/** Resolve filesystem aliases while preserving a suffix that does not exist yet. */
export function canonicalFilesystemPath(candidate: string): string {
  let existing = path.resolve(candidate);
  const missing: string[] = [];
  for (;;) {
    try {
      return path.resolve(realpathSync.native(existing), ...missing);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      // A dangling symlink is an existing entry, not a missing path segment.
      // Refuse it rather than allowing a later write to follow an unknown target.
      let entry: ReturnType<typeof lstatSync> | undefined;
      try {
        entry = lstatSync(existing);
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT")
          throw statError;
      }
      if (entry !== undefined) throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw error;
      missing.unshift(path.basename(existing));
      existing = parent;
    }
  }
}
