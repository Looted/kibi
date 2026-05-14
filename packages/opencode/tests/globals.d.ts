/**
 * Test-environment globals declared for TypeScript.
 *
 * `tui.tsx` uses JSX with the classic transform (`jsx: react`, `jsxFactory: h`).
 * The test suite sets `globalThis.h` and `globalThis.Fragment` at module init
 * (tui-plugin.test.ts lines 30-35), but tsc needs ambient declarations so
 * `h` and `Fragment` are considered in-scope wherever JSX is compiled.
 *
 * `JSX.IntrinsicElements` is a permissive catch-all: all string tag names are
 * accepted with record-typed props. This avoids importing the full @opentui/solid
 * type graph into test compilation while keeping `box`, `text`, `scrollbox`, etc.
 * from triggering TS7026.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function h(tag: unknown, props: unknown, ...children: unknown[]): unknown;
declare const Fragment: unknown;

declare namespace JSX {
  type Element = unknown;
  // Permissive: any lowercase tag (box, text, scrollbox, …) is valid.
  interface IntrinsicElements {
    // biome-ignore lint/suspicious/noExplicitAny: permissive JSX intrinsics for test env
    [elementName: string]: Record<string, any>;
  }
}
