# Dev only: records tests/fixtures/tokenizer-boundaries.json with the upstream
# Hugging Face tokenizer. Run from a directory holding potion/tokenizer.json
# (the pinned potion-base-8M revision) with `pip install tokenizers`.
import json
from tokenizers import Tokenizer
tok = Tokenizer.from_file("potion/tokenizer.json")
ranges=[(0x4e00,0x9fff),(0x3400,0x4dbf),(0x20000,0x2a6df),(0x2a700,0x2b73f),(0x2b740,0x2b81f),(0x2b820,0x2ceaf),(0x2b920,0x2ceaf),(0xf900,0xfaff),(0x2f800,0x2fa1f)]
texts=[]
for lo,hi in ranges:
    for c in (lo-1,lo,hi,hi+1):
        texts.append("a"+chr(c)+"b")
for c in [32,33,47,48,57,58,64,65,90,91,96,97,122,123,126,127,0xa1,0x2014]:
    texts.append("a"+chr(c)+"b")
for c in ["\t","\n","\r","\x00","�","​"," ","　","\x07","\x1f","\x7f",""," "]:
    texts.append("a"+c+"b")
for n in (99,100,101):
    texts.append("x"*n)
    texts.append("go "+"a"*n+" now")
for t in ["[PAD]","[UNK]","[CLS]","[SEP]","[MASK]","a[PAD]b","x [MASK] y","[pad] [unk]","[UNK][SEP]"]:
    texts.append(t)
texts += ["  leading","trailing  ","a  b","!!",".a.","a.","Ab Cd","ÀÉ","unaffable","un ##aff","playing","##"]
out=[{"text":t,"ids":tok.encode(t,add_special_tokens=False).ids} for t in texts]
json.dump(out,open(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "tests", "fixtures", "tokenizer-boundaries.json"),"w"),ensure_ascii=False,indent=0)
print(len(out))
