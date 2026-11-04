---
"kibi-cli": patch
---

Markdown entities with a quoted or block-scalar title that contains a colon (`title: "Foo: Bar"`) are no longer reported as "Unquoted colon likely in title" when the YAML error is elsewhere in the front matter.
