/** Problems that stop a platform package from being packed; empty when valid. */
// implements REQ-prolog-bundled-release
export function verifySwiplPayload(root: string): string[];

/** The prepack check: reports problems on stderr and returns the exit code. */
// implements REQ-prolog-bundled-release
export function prepack(root?: string): number;
