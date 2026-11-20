# Third-party licences

The released `kibi-swipl-win32-x64` tarball replaces this placeholder with the
licence texts of everything linked into the bundled SWI-Prolog build:

- SWI-Prolog (BSD-2-Clause)
- OpenSSL (Apache-2.0)
- PCRE2 (BSD-3-Clause with PCRE2 exemption)
- zlib (Zlib)
- GMP (LGPL-3.0-or-later; `libgmp-10.dll` ships in the upstream Windows build
  and provides SWI-Prolog's unbounded integers)

The texts come from the `licenses/` directory of the swipl-build pipeline
archive and are verified to be non-empty before packing.
