---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

Non-ASCII text such as `§`, `¶`, `–` or accented letters now keeps its characters when Kibi runs under a POSIX or other non-UTF-8 locale. Before, the store held U+FFFD replacement characters for every non-ASCII byte, `kb_query` and `kb_search` returned them, and the next `kb_upsert` of an entity wrote them back into its authored file, even into fields the write did not touch. Run `kibi sync --rebuild` once after upgrading to replace corrupted text in the store; authored files that a write already rewrote need their text restored by hand.

The SWI-Prolog child now switches its standard streams and default file encoding to UTF-8 before loading the KB module, one-shot goals travel to it as base64 of their UTF-8 bytes instead of a raw environment value, and Prolog output is decoded with a streaming UTF-8 decoder so a character divided between two output chunks stays whole.
