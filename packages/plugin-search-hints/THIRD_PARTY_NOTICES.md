# Third-party notices

The package bundles the static embedding table of [potion-base-8M](https://huggingface.co/minishlab/potion-base-8M) by Minish Lab (MIT, `licenses/potion-base-8M-MIT.txt`), revision `bf8b056651a2c21b8d2565580b8569da283cab23`, and its WordPiece vocabulary, which comes from [bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) by BAAI (MIT, `licenses/bge-base-en-v1.5-vocabulary-MIT.txt`).

`assets/potion-base-8M.int8.bin` is the upstream `model.safetensors` table quantized to signed 8-bit values with one float32 scale per row by `scripts/build-model-asset.mjs`; `assets/vocab.txt` lists the upstream tokenizer vocabulary in id order. The upstream file digest, the asset digests and the quantization are recorded in `catalog.json`; package-file digests are recorded in `integrity.json`.

The tokenizer and encoder are Kibi-authored TypeScript. No upstream code, Python package or native library is shipped or executed, and nothing is downloaded at runtime.
