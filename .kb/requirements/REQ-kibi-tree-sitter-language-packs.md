---
title: Tree-sitter grammars install as per-language packs the plugin verifies
status: open
priority: should
required_evidence: tested
tags:
  - plugin
  - multilingual
  - source-analysis
semantic_text: 'kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. The kibi-plugin-treesitter plugin must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256. Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review, unless the project declined that pack or the file is generated. Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file. Kibi coordinate refresh must refresh the other files when one file cannot be analyzed as a whole and name that file. Kibi must not analyze its own knowledge-base files as project source or suggest a grammar pack for them. The kibi-plugin-treesitter plugin must read a C or C++ header include guard, a C++ linkage guard, an #if 0 block and the nested blocks of a Terraform resource without reporting them as analysis gaps. Kibi doctor must fail when a plugin that package.json declares is not installed or is not the release-qualified build. Kibi coordinate refresh must keep the stored coordinates while such a plugin is missing or unqualified. Kibi check must report a symbol that has no source coordinates. Kibi doctor, kibi init and kb_plan_bootstrap must not count a generated file toward a kibi-lang pack unless the KB references that file. Kibi must not suggest a kibi-lang pack that package.json kibi.declinedLanguagePacks lists.'
semantic_clauses:
  - kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog.
  - The kibi-plugin-treesitter plugin must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install.
  - Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256.
  - Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review, unless the project declined that pack or the file is generated.
  - Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file.
  - Kibi coordinate refresh must refresh the other files when one file cannot be analyzed as a whole and name that file.
  - Kibi must not analyze its own knowledge-base files as project source or suggest a grammar pack for them.
  - 'The kibi-plugin-treesitter plugin must read a C or C++ header include guard, a C++ linkage guard, an #if 0 block and the nested blocks of a Terraform resource without reporting them as analysis gaps.'
  - Kibi doctor must fail when a plugin that package.json declares is not installed or is not the release-qualified build.
  - Kibi coordinate refresh must keep the stored coordinates while such a plugin is missing or unqualified.
  - Kibi check must report a symbol that has no source coordinates.
  - Kibi doctor, kibi init and kb_plan_bootstrap must not count a generated file toward a kibi-lang pack unless the KB references that file.
  - Kibi must not suggest a kibi-lang pack that package.json kibi.declinedLanguagePacks lists.
origin:
  kind: agent
  ref: 'Maintainer question, 2026-10-31, on the tree-sitter plugin shipping every grammar: "Will everyone have to load support for all languages?", then the decision to split the grammars into per-language packs in the same change'
  approved_by: maintainer
  recorded_at: '2026-11-01T16:04:46.550Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9854a3671f7e18d1b4117051ae17e851889ffc211eaeb85b59c7d60201282ae5
semantic_inventory:
  - claim_key: CLAIM-D505D88A180B2074
    claim_text: kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog
    role: normative
    status: modeled
    span:
      start: 0
      end: 240
  - claim_key: CLAIM-A63DEEFB7D52A494
    claim_text: The kibi-plugin-treesitter plugin must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install
    role: normative
    status: modeled
    span:
      start: 242
      end: 392
  - claim_key: CLAIM-D6CD5D402951CCF7
    claim_text: Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256
    role: normative
    status: modeled
    span:
      start: 394
      end: 583
  - claim_key: CLAIM-FB0B017EC066E878
    claim_text: Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review, unless the project declined that pack or the file is generated
    role: exception
    status: modeled
    span:
      start: 585
      end: 789
  - claim_key: CLAIM-DAF206C33AE40835
    claim_text: Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file
    role: normative
    status: modeled
    span:
      start: 791
      end: 953
  - claim_key: CLAIM-1DDE26428802FFE1
    claim_text: Kibi coordinate refresh must refresh the other files when one file cannot be analyzed as a whole and name that file
    role: normative
    status: modeled
    span:
      start: 955
      end: 1070
  - claim_key: CLAIM-A40ADAF1E50ACB44
    claim_text: Kibi must not analyze its own knowledge-base files as project source or suggest a grammar pack for them
    role: normative
    status: modeled
    span:
      start: 1072
      end: 1175
  - claim_key: CLAIM-46F6BC65ACB8AA0F
    claim_text: 'The kibi-plugin-treesitter plugin must read a C or C++ header include guard, a C++ linkage guard, an #if 0 block and the nested blocks of a Terraform resource without reporting them as analysis gaps'
    role: normative
    status: modeled
    span:
      start: 1177
      end: 1375
  - claim_key: CLAIM-CC3F0410A6FD8F49
    claim_text: Kibi doctor must fail when a plugin that package.json declares is not installed or is not the release-qualified build
    role: normative
    status: modeled
    span:
      start: 1377
      end: 1494
  - claim_key: CLAIM-6C5496B05A6AAF7F
    claim_text: Kibi coordinate refresh must keep the stored coordinates while such a plugin is missing or unqualified
    role: normative
    status: modeled
    span:
      start: 1496
      end: 1598
  - claim_key: CLAIM-CD77D169C7164E30
    claim_text: Kibi check must report a symbol that has no source coordinates
    role: normative
    status: modeled
    span:
      start: 1600
      end: 1662
  - claim_key: CLAIM-B36E5D3D69DC6CAB
    claim_text: Kibi doctor, kibi init and kb_plan_bootstrap must not count a generated file toward a kibi-lang pack unless the KB references that file
    role: exception
    status: modeled
    span:
      start: 1664
      end: 1799
  - claim_key: CLAIM-11F2979A6FFA1E9A
    claim_text: Kibi must not suggest a kibi-lang pack that package.json kibi.declinedLanguagePacks lists
    role: normative
    status: modeled
    span:
      start: 1801
      end: 1890
logic_claims:
  - CLAIM-D505D88A180B2074
  - CLAIM-A63DEEFB7D52A494
  - CLAIM-D6CD5D402951CCF7
  - CLAIM-FB0B017EC066E878
  - CLAIM-DAF206C33AE40835
  - CLAIM-1DDE26428802FFE1
  - CLAIM-A40ADAF1E50ACB44
  - CLAIM-46F6BC65ACB8AA0F
  - CLAIM-CC3F0410A6FD8F49
  - CLAIM-6C5496B05A6AAF7F
  - CLAIM-CD77D169C7164E30
  - CLAIM-B36E5D3D69DC6CAB
  - CLAIM-11F2979A6FFA1E9A
id: REQ-kibi-tree-sitter-language-packs
type: req
---
kibi-plugin-treesitter must load a Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, Terraform, HCL or SWI-Prolog grammar from its kibi-lang pack only when the installed pack version and the grammar file SHA-256 match the release catalog. The kibi-plugin-treesitter plugin must refuse a source file whose kibi-lang pack is missing, another version or modified, and name the pack to install. Kibi doctor must name the kibi-lang packs that tracked sources need and that are not installed at the version the installed plugin pins or whose grammar file differs from the pinned SHA-256. Kibi must block a staged change to a source file whose kibi-lang pack is missing or another version instead of accepting a whole-file review, unless the project declined that pack or the file is generated. Kibi coordinate refresh must keep the coordinates of a symbol declared outside the local uncovered ranges of a partially analyzed file and warn once for that file. Kibi coordinate refresh must refresh the other files when one file cannot be analyzed as a whole and name that file. Kibi must not analyze its own knowledge-base files as project source or suggest a grammar pack for them. The kibi-plugin-treesitter plugin must read a C or C++ header include guard, a C++ linkage guard, an #if 0 block and the nested blocks of a Terraform resource without reporting them as analysis gaps. Kibi doctor must fail when a plugin that package.json declares is not installed or is not the release-qualified build. Kibi coordinate refresh must keep the stored coordinates while such a plugin is missing or unqualified. Kibi check must report a symbol that has no source coordinates. Kibi doctor, kibi init and kb_plan_bootstrap must not count a generated file toward a kibi-lang pack unless the KB references that file. Kibi must not suggest a kibi-lang pack that package.json kibi.declinedLanguagePacks lists.

## Context

Until 3.0, kibi-plugin-treesitter shipped all thirteen grammars (about 16 MB; C# alone is 5.35 MB) to every project that installed it. Every grammar moved unchanged into a data-only package (kibi-lang-python, kibi-lang-go, kibi-lang-rust, kibi-lang-java, kibi-lang-csharp, kibi-lang-php, kibi-lang-c, kibi-lang-cpp, kibi-lang-bash, kibi-lang-ruby, kibi-lang-hcl, kibi-lang-prolog) with no code or scripts, so every language is installed and verified the same way and the plugin ships only queries and code. JavaScript and TypeScript need no pack because Kibi parses them itself. The plugin's catalog.json, which its release qualification covers, pins each pack's version and each grammar file's size and SHA-256, so the bytes that can run are still fixed by the qualified plugin. A missing pack must refuse, never silently downgrade, so a file in a language whose pack is absent is reported unsupported with its install line, for symbols and for references. kibi doctor, kibi init and kb_plan_bootstrap name the packs the tracked sources need, and kibi doctor names an installed pack whose grammar bytes changed. A missing pack must not disarm the staged gate, so a change to such a file blocks until the pack is installed. Installing a pack must not make Kibi worse than having none: a file the grammar reads only partly (a C include, a Rust macro, a nested HCL block) keeps the coordinates of the symbols declared outside its uncovered ranges, with one warning, instead of aborting the refresh for the whole repository, and a file the grammar cannot read at all (a syntax error the grammar may also report for valid code) loses only its own coordinates. Kibi's own .kb files, its Prolog schema included, are not project source and never ask for a pack. Header idioms whose preprocessor outcome is fixed (an include guard, an extern "C" linkage guard, #if 0) are read as the compiler reads them, and Terraform nested blocks belong to the resource that holds them, so installing a pack does not turn ordinary files into gaps. A declared plugin that is missing or not the qualified build fails kibi doctor and never wipes stored coordinates, and kibi check reports symbols left without coordinates instead of letting them look linked. A grammar repository showed the limit of counting every tracked file: tree-sitter init writes Go, Rust, C, C++ and Python bindings that the project never edits, and doctor asked for six packs although only one generated binding backed a proof. A generated file (linguist-generated or linguist-vendored in .gitattributes, or a generator header) therefore counts only when the KB names it, and an owner can decline any pack in package.json kibi.declinedLanguagePacks. Declining a pack, or generating a file, makes a staged change to such a file a whole-file review like any language no plugin reads; the declined list comes from the committed configuration, so a commit cannot decline the pack of the source it changes.

## Source

Maintainer question, 2026-10-31: "Will everyone have to load support for all languages?", followed by the decision to split the grammars into per-language packs in this change.

Maintainer question, 2026-11-02, after kibi doctor asked a grammar repository for six packs: "Did doctor behave as expected? I was thinking maybe we could just allow to ignore languages the project owner knows are not actually required?"