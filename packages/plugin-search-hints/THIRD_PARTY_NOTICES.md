# Third-party notices

The package bundles the static embedding table of [potion-retrieval-32M](https://huggingface.co/minishlab/potion-retrieval-32M) by Minish Lab (MIT, `licenses/potion-retrieval-32M-MIT.txt`), revision `6fc8051fab2a1e0ee76689cf08c853792ac285e7`, and its WordPiece vocabulary: the vocabulary of [bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) by BAAI (MIT, `licenses/bge-base-en-v1.5-vocabulary-MIT.txt`) followed by 33,563 whole-word tokens Minish Lab added to it (MIT, as the model).

`assets/potion-retrieval-32M.int8.bin` is the upstream `model.safetensors` table quantized to signed 8-bit values with one float32 scale per row by `scripts/build-model-asset.mjs`; `assets/vocab.txt` lists the upstream tokenizer vocabulary in id order. The upstream file digest, the asset digests and the quantization are recorded in `catalog.json`; package-file digests are recorded in `integrity.json`.

The tokenizer and encoder are Kibi-authored TypeScript. No upstream code, Python package or native library is shipped or executed, and nothing is downloaded at runtime.
