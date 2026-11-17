---
"kibi-core": patch
---

A branch store whose workspace path is up to about 115 characters long but full of `/`, `-` or `.` characters no longer crashes on its first write. SWI-Prolog's `rdf_persistency` names each journal after the store's graph URI and percent-encodes every character except ASCII letters, digits and `_`, so a `/`, `-` or `.` takes three bytes. Kibi switched to a short `urn:kibi:store:<digest>` graph URI only when the `file://` URI was longer than 200 characters, but a shorter URI could still encode to a journal name over the 255-byte file name limit. Opening that journal failed with "File name too long" inside SWI's RDF monitor, SWI-Prolog 10.0.2 aborted the engine ("API error: invalid term_t … (out of range)"), and `kibi sync` reported "Query interrupted because the Prolog process terminated".

Kibi now measures the encoded file name: a store keeps its `file://` graph URI only while the encoded name plus the longest suffix `rdf_persistency` adds (`.trp.new`) fits in 255 bytes, and uses the digest URI otherwise. An existing store keeps the graph it was written with.
