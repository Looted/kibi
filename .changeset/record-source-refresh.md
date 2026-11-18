---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_record`'s step for a requirement without enough body context can now be followed when the person gave a short reason. A new `origin.ref` replaces the requirement's Source section with the person's new words, where it used to keep the old quote, so citing their words clears the finding. On a firm requirement whose reason is the person's, the step asks for their words as `origin.ref` together with the fuller reason, since the reason is not rewritten in place without them. Separately, re-sending a requirement body whose statement the file already holds no longer replaces a `semantic_text` that was written apart from the body (for a firm requirement, a byte-identical resend used to be refused); the statement is restated only when the sent body states something new.
