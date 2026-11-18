---
"kibi-cli": patch
---

The paste-ready `kb_upsert` record that `kibi check --staged` prints for a new type, interface, enum or constant now gets an id no other record holds, chosen the way `implementedBy` chooses one (directory-qualified, then path-qualified, then numbered). Two files exporting the same name, such as `Options` in two `index.ts` files, used to be offered the same id, so pasting the second record moved the first file's record. The block now says "is new and has no symbol record" instead of calling a constant a type.
