# kibi-lang-prolog

## 1.1.0

### Minor Changes

- Ship the grammar from `tree-sitter-swi-prolog` 0.1.3 (was 0.1.0). An unknown prefix or postfix operator's parse error now stays inside its own clause instead of spreading to the clauses after it.

## 1.0.0

### Major Changes

- First release. The SWI-Prolog grammar moved here from `kibi-plugin-treesitter` 2.x so a project installs only the languages it uses.
