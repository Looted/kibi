/**
 * Process environment helpers that edit `process.env` in place.
 *
 * Replacing the object (`process.env = {...}`) detaches it from the real
 * environment, so later writes such as `TMPDIR` no longer reach
 * `os.tmpdir()` or child processes in the rest of the run.
 */

/** Sets each key, deleting the ones given as undefined. */
export function setProcessEnv(values: NodeJS.ProcessEnv): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
}

/** Puts `process.env` back to the snapshot, key by key. */
export function restoreProcessEnv(snapshot: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(process.env)) {
    if (!Object.hasOwn(snapshot, key)) Reflect.deleteProperty(process.env, key);
  }
  setProcessEnv(snapshot);
}
