## [2026-02-18] Fix literal_to_atom ^^/2 Functor

- Modified: packages/core/src/kb.pl (literal_to_atom and literal_to_value adjustments)
- Reason: RDF typed literals returned by SWI-Prolog use the ^^/2 functor; tests expected typed literal forms to be preserved or handled correctly.
- Change: literal_to_atom/2 now handles the ^^(Value, Type) functor and converts value to atom when appropriate. literal_to_value/2 preserves ^^/2 for string typed literals unless parsed as a Prolog list.
- Verification: Ran PLUnit test suite: all 9 tests passed locally.

Notes:
- Did not modify tests or RDF storage format. Change is limited to conversion helpers.
