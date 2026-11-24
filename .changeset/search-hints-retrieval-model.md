---
"kibi-plugin-search-hints": minor
---

Search hints now embed text with potion-retrieval-32M, a static model2vec embedding tuned for retrieval, instead of potion-base-8M. On Kibi's own 20 reworded questions the expected requirement is in the top three or the hints for 14 instead of 12, and on a 44-requirement product knowledge base for 19 of 20 lay questions instead of 17. The model is still offline, MIT licensed and pure TypeScript; the package grows from about 8 MB to about 33 MB, and entity vectors are rebuilt once after the upgrade because the cache is keyed by the model.

Reading the vector cache and scoring entities no longer goes through a per-value callback, so a weak search with hints costs about the same time with the larger model as it did with the smaller one.
