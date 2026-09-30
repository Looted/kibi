#!/usr/bin/env python3
"""Phase-1 SWI-Prolog relocation experiment. Native builds run only in Actions."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shlex
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = Path(__file__).with_name("swipl-version.json")
TARGETS = {
    "linux-x64-gnu": ("linux", "x86_64"),
    "darwin-arm64": ("darwin", "arm64"),
}
REQUIRED_LIBRARIES = (
    "semweb/rdf_db", "semweb/rdf_persistency", "semweb/sparql_client",
    "pcre", "crypto", "sha", "http/json", "http/json_convert",
    "chr", "clpfd", "thread", "persistency", "filesex", "readutil",
    "date", "aggregate", "solution_sequences", "prolog_coverage",
)
PACKAGE_LIST = "chr;clib;http;plunit;semweb;pcre;ssl"
BUILD_JOBS = min(4, os.cpu_count() or 2)
LINUX_SYSTEM_LIBRARIES = {
    "libc.so.6", "libm.so.6", "libpthread.so.0", "libdl.so.2",
    "ld-linux-x86-64.so.2",
}
VENDORED_LIBRARY_PREFIXES = ("libssl.", "libcrypto.", "libpcre2-8.", "libz.")


def run(
    *command: str, cwd: Path | None = None, env: dict[str, str] | None = None,
    capture: bool = True,
) -> str:
    print("+", shlex.join(str(part) for part in command), flush=True)
    result = subprocess.run(
        [str(part) for part in command], cwd=cwd, env=env, text=True, check=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )
    return result.stdout.strip() if result.stdout else ""


def pin(manifest: dict, name: str | None = None) -> dict:
    return manifest if name is None else manifest["dependencies"][name]


def validate(manifest_path: Path, target: str) -> dict:
    if target not in TARGETS:
        raise ValueError(f"Unsupported SWI spike target: {target}")
    try:
        manifest = json.loads(manifest_path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Cannot read SWI spike pin manifest: {error}") from error
    if not isinstance(manifest, dict) or not isinstance(manifest.get("dependencies"), dict):
        raise ValueError("SWI spike pin manifest must contain dependencies")
    for name in (None, "openssl", "pcre2", "zlib"):
        try:
            entry = pin(manifest, name)
            version, digest = entry["version"], entry["sha256"]
            url = entry.get("url") if name else None
        except (KeyError, TypeError) as error:
            raise ValueError(f"Missing pin for {name or 'swipl'}: {error}") from error
        version_pattern = r"\d+\.\d+\.\d+" if name is None else r"\d+\.\d+(?:\.\d+)?"
        if not isinstance(version, str) or not re.fullmatch(version_pattern, version):
            raise ValueError(f"Invalid version pin for {name or 'swipl'}")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"Invalid SHA-256 pin for {name or 'swipl'}")
        if name and (not isinstance(url, str) or not url.startswith("https://")):
            raise ValueError(f"Invalid source URL for {name}")
    return manifest


def source_archive(work: Path, name: str, version: str, digest: str, url: str) -> Path:
    archive = work / "downloads" / f"{name}-{version}.tar.gz"
    archive.parent.mkdir(parents=True, exist_ok=True)
    if not archive.exists():
        print(f"Downloading {url}", flush=True)
        urllib.request.urlretrieve(url, archive)
    actual = hashlib.sha256(archive.read_bytes()).hexdigest()
    if actual != digest:
        raise ValueError(f"{name} SHA-256 mismatch: expected {digest}, got {actual}")
    source = work / "source" / f"{name}-{version}"
    source.parent.mkdir(parents=True, exist_ok=True)
    if not source.exists():
        run("tar", "-xzf", str(archive), "-C", str(source.parent), capture=False)
    if not source.is_dir():
        raise ValueError(f"Archive did not contain {source.name}")
    return source


def cmake_project(source: Path, build: Path, install: Path, target: str, *options: str) -> None:
    flags = [
        "-DCMAKE_BUILD_TYPE=Release", f"-DCMAKE_INSTALL_PREFIX={install}",
        "-DCMAKE_INSTALL_LIBDIR=lib", "-DBUILD_SHARED_LIBS=ON",
    ]
    if target.startswith("darwin"):
        flags.append("-DCMAKE_OSX_DEPLOYMENT_TARGET=12.0")
    run("cmake", "-S", str(source), "-B", str(build), *flags, *options, capture=False)
    run("cmake", "--build", str(build), "--parallel", str(BUILD_JOBS), capture=False)
    run("cmake", "--install", str(build), capture=False)


def library(deps: Path, stem: str, target: str) -> Path:
    suffix = ".dylib" if target.startswith("darwin") else ".so"
    candidate = deps / "lib" / f"lib{stem}{suffix}"
    if not candidate.exists():
        raise ValueError(f"Missing vendored library: {candidate}")
    return candidate


def build(manifest: dict, target: str, work: Path) -> Path:
    if os.getenv("GITHUB_ACTIONS") != "true":
        raise ValueError("SWI native spike builds are allowed only in GitHub Actions")
    expected_os, expected_cpu = TARGETS[target]
    actual_os = "darwin" if sys.platform == "darwin" else "linux" if sys.platform == "linux" else sys.platform
    if (actual_os, platform.machine()) != (expected_os, expected_cpu):
        raise ValueError(f"Runner is {actual_os}/{platform.machine()}, expected {expected_os}/{expected_cpu}")
    if shutil.which("swipl"):
        raise ValueError("A system swipl is already on PATH; the spike requires a clean runner")
    work = work.resolve()
    if (work / "relocated").exists():
        raise ValueError(f"Work directory already has a relocated build: {work}")
    deps = work / "dependencies"
    install = work / "original-install"
    relocated = work / "relocated"
    build_dir = work / "build"
    sources = {}
    for name in ("zlib", "pcre2", "openssl"):
        entry = pin(manifest, name)
        sources[name] = source_archive(work, name, entry["version"], entry["sha256"], entry["url"])
    cmake_project(sources["zlib"], build_dir / "zlib", deps, target)
    cmake_project(
        sources["pcre2"], build_dir / "pcre2", deps, target,
        "-DBUILD_STATIC_LIBS=OFF", "-DPCRE2_BUILD_PCRE2_16=OFF",
        "-DPCRE2_BUILD_PCRE2_32=OFF", "-DPCRE2_BUILD_PCRE2GREP=OFF",
        "-DPCRE2_BUILD_TESTS=OFF", "-DPCRE2_SUPPORT_LIBZ=OFF",
        "-DPCRE2_SUPPORT_LIBBZ2=OFF", "-DPCRE2_SUPPORT_LIBREADLINE=OFF",
    )
    openssl_env = os.environ.copy()
    if target.startswith("darwin"):
        openssl_env["MACOSX_DEPLOYMENT_TARGET"] = "12.0"
    openssl_target = "darwin64-arm64-cc" if target.startswith("darwin") else "linux-x86_64"
    run(
        "./Configure", openssl_target, f"--prefix={deps}", f"--openssldir={deps / 'ssl'}",
        "--libdir=lib", "shared", "no-tests", "no-docs", "no-engine", "no-module", "no-zlib",
        cwd=sources["openssl"], env=openssl_env, capture=False,
    )
    run("make", f"-j{BUILD_JOBS}", cwd=sources["openssl"], env=openssl_env, capture=False)
    run("make", "install_sw", cwd=sources["openssl"], env=openssl_env, capture=False)

    swipl = source_archive(
        work, "swipl", manifest["version"], manifest["sha256"],
        f"https://www.swi-prolog.org/download/stable/src/swipl-{manifest['version']}.tar.gz",
    )
    zlib = library(deps, "z", target)
    pcre = library(deps, "pcre2-8", target)
    flags = [
        "-DUSE_GMP=OFF", "-DUSE_LIBBF=ON", "-DUSE_TCMALLOC=OFF",
        "-DSWIPL_PACKAGES_X=OFF", "-DSWIPL_PACKAGES_JAVA=OFF",
        "-DSWIPL_PACKAGES_ODBC=OFF", "-DSWIPL_PACKAGES_BDB=OFF",
        "-DSWIPL_PACKAGES_GUI=OFF", "-DINSTALL_DOCUMENTATION=OFF",
        "-DBUILD_PDF_DOCUMENTATION=OFF", "-DBUILD_TESTING=OFF",
        "-DBUILD_SWIPL_LD=OFF", "-DINSTALL_QLF=OFF",
        "-DSWIPL_INSTALL_AS_LINK=OFF", f"-DSWIPL_PACKAGE_LIST={PACKAGE_LIST}",
        "-DCMAKE_DISABLE_FIND_PACKAGE_Curses=TRUE",
        "-DCMAKE_DISABLE_FIND_PACKAGE_LibUUID=TRUE",
        f"-DCMAKE_PREFIX_PATH={deps}", f"-DZLIB_INCLUDE_DIR={deps / 'include'}",
        f"-DZLIB_LIBRARY={zlib}", f"-DOPENSSL_ROOT_DIR={deps}",
        f"-DOPENSSL_CRYPTO_LIBRARY={library(deps, 'crypto', target)}",
        f"-DOPENSSL_SSL_LIBRARY={library(deps, 'ssl', target)}",
        f"-DPCRE_INCLUDE_DIR={deps / 'include'}", f"-DPCRE_LIBRARY={pcre}",
    ]
    if target.startswith("darwin"):
        flags.append(f"-DMACOSX_DEPENDENCIES_FROM={deps}")
    else:
        # glibc 2.28 provides clock_gettime in libc; librt is outside the
        # launch package's permitted external dependency set.
        flags.append("-DHAVE_LIBRT=OFF")
        # Keep Linux independent of libcrypt. macOS must use its SDK crypt
        # probe: SWI's BSD fallback includes crypt.h, absent from that SDK.
        flags.extend(("-DHAVE_CRYPT=0", "-DHAVE_LIBCRYPT=0"))
    cmake_project(swipl, build_dir / "swipl", install, target, *flags)
    shutil.copytree(install, relocated, symlinks=True)
    licenses = relocated / "licenses"
    licenses.mkdir()
    for label, file in (
        ("SWI-Prolog-LICENSE", swipl / "LICENSE"),
        ("OpenSSL-LICENSE.txt", sources["openssl"] / "LICENSE.txt"),
        ("PCRE2-COPYING", sources["pcre2"] / "COPYING"),
        ("zlib-LICENSE", sources["zlib"] / "LICENSE"),
    ):
        shutil.copy2(file, licenses / label)
    vendor = relocated / "lib" / "vendor"
    vendor.mkdir(parents=True)
    for path in (deps / "lib").iterdir():
        shared = path.name.endswith(".dylib") if target.startswith("darwin") else bool(re.search(r"\.so(?:\.\d+)*$", path.name))
        if shared and path.name.startswith(("libssl.", "libcrypto.", "libpcre2-8.", "libz.")):
            if path.is_symlink():
                (vendor / path.name).symlink_to(os.readlink(path))
            elif path.is_file():
                shutil.copy2(path, vendor / path.name)
    relocate(relocated, target)
    for old in (install, deps, work / "source", build_dir):
        shutil.rmtree(old)
    return relocated


def native_files(prefix: Path, target: str) -> list[Path]:
    result = []
    for path in prefix.rglob("*"):
        if not path.is_file() or path.is_symlink():
            continue
        magic = path.open("rb").read(4)
        if target.startswith("linux") and magic == b"\x7fELF":
            result.append(path)
        if target.startswith("darwin") and magic in (
            b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xca\xfe\xba\xbe",
        ):
            result.append(path)
    return result


def relocate(prefix: Path, target: str) -> None:
    for path in prefix.rglob("*"):
        if path.is_symlink() and (not path.exists() or not path.resolve().is_relative_to(prefix)):
            raise ValueError(f"Staged symlink escapes relocated prefix or is dangling: {path}")
    files = native_files(prefix, target)
    if not files:
        raise ValueError("No native files found in the staged SWI prefix")
    vendor = prefix / "lib" / "vendor"
    if target.startswith("linux"):
        swipl_libraries = [path for path in files if path.name.startswith("libswipl.so")]
        if len(swipl_libraries) != 1:
            raise ValueError(f"Expected one libswipl native library, found {swipl_libraries}")
        swipl_lib_dir = swipl_libraries[0].parent
        for path in files:
            paths = [
                f"$ORIGIN/{os.path.relpath(vendor, path.parent)}",
                f"$ORIGIN/{os.path.relpath(swipl_lib_dir, path.parent)}",
            ]
            run("patchelf", "--set-rpath", ":".join(paths), str(path), capture=False)
            run("strip", "--strip-unneeded", str(path))
        audit_linux(files, prefix)
    else:
        native = set(files)
        by_name = {}
        for alias in prefix.rglob("*"):
            if alias.is_file() and alias.resolve().is_relative_to(prefix) and alias.resolve() in native:
                by_name[alias.name] = alias
        for path in files:
            run("strip", "-x", str(path))
            output = run("otool", "-L", str(path))
            for index, line in enumerate(output.splitlines()[1:]):
                old = line.strip().split(" (", 1)[0]
                if not old or (index == 0 and path.suffix == ".dylib"):
                    continue
                if old.startswith(("/usr/lib/", "/System/Library/")):
                    continue
                destination = by_name.get(Path(old).name)
                if destination is None:
                    raise ValueError(f"Unvendored Mach-O dependency in {path}: {old}")
                new = "@loader_path/" + os.path.relpath(destination, path.parent)
                run("install_name_tool", "-change", old, new, str(path))
            if path.suffix == ".dylib":
                run("install_name_tool", "-id", "@loader_path/" + path.name, str(path))
            run("codesign", "--force", "-s", "-", str(path))
        audit_macos(files)


def audit_linux(files: list[Path], prefix: Path) -> None:
    vendor = prefix / "lib" / "vendor"
    for path in files:
        dynamic = run("readelf", "-d", str(path))
        needed = re.findall(r"\(NEEDED\).*?\[(.*?)\]", dynamic)
        for name in needed:
            if name not in LINUX_SYSTEM_LIBRARIES and not name.startswith(VENDORED_LIBRARY_PREFIXES) and not name.startswith("libswipl.so"):
                raise ValueError(f"Forbidden ELF dependency in {path}: {name}")
        linked = run("ldd", str(path))
        if "not found" in linked:
            raise ValueError(f"Unresolved ELF dependency in {path}:\n{linked}")
        for line in linked.splitlines():
            match = re.search(r"^\s*(\S+)\s+=>\s+(\S+)", line)
            if match and match.group(1).startswith(VENDORED_LIBRARY_PREFIXES):
                resolved = Path(match.group(2)).resolve()
                if not resolved.is_relative_to(vendor):
                    raise ValueError(f"Dependency escaped vendor directory: {path}: {line}")
            if match and match.group(1).startswith("libswipl.so"):
                resolved = Path(match.group(2)).resolve()
                if not resolved.is_relative_to(prefix):
                    raise ValueError(f"libswipl escaped relocated prefix: {path}: {line}")


def audit_macos(files: list[Path]) -> None:
    for path in files:
        output = run("otool", "-L", str(path))
        for line in output.splitlines()[1:]:
            dependency = line.strip().split(" (", 1)[0]
            if dependency and not dependency.startswith(("@loader_path/", "/usr/lib/", "/System/Library/")):
                raise ValueError(f"Unrelocated Mach-O dependency in {path}: {dependency}")
        commands = run("otool", "-l", str(path))
        versions = []
        for block in re.split(r"(?=\bcmd LC_)", commands):
            if "cmd LC_BUILD_VERSION" in block:
                versions.extend(re.findall(r"\bminos\s+(\d+)\.(\d+)", block))
            elif "cmd LC_VERSION_MIN_MACOSX" in block:
                versions.extend(re.findall(r"\bversion\s+(\d+)\.(\d+)", block))
        if versions and any((int(major), int(minor)) > (12, 0) for major, minor in versions):
            raise ValueError(f"Mach-O deployment target exceeds macOS 12: {path}: {versions}")


def exercise(prefix: Path, manifest: dict, target: str, work: Path) -> None:
    binary = prefix / "bin" / "swipl"
    home = prefix / "lib" / "swipl"
    if not binary.is_file() or not home.is_dir():
        raise ValueError(f"Incomplete relocated prefix: {binary} / {home}")
    env = os.environ.copy()
    env["PATH"] = f"{prefix / 'bin'}{os.pathsep}{env['PATH']}"
    env["SWI_HOME_DIR"] = str(home)
    env["NODE_ENV"] = "test"
    env["KIBI_RUNTIME_DIR"] = str(work / "cli-runtime")
    env.pop("KIBI_BRANCH", None)
    for key in ("LD_LIBRARY_PATH", "DYLD_LIBRARY_PATH", "DYLD_FALLBACK_LIBRARY_PATH"):
        env.pop(key, None)
    resolved = shutil.which("swipl", path=env["PATH"])
    if resolved is None or not Path(resolved).resolve().is_relative_to(prefix):
        raise ValueError(f"Tests would not use relocated swipl: {resolved}")
    package = work / "swipl-relocated.tar.gz"
    run("tar", "-czf", str(package), "-C", str(prefix), ".", capture=False)
    unpacked_kib = int(run("du", "-sk", str(prefix)).split()[0])
    report = {
        "target": target, "swiplVersion": manifest["version"],
        "requiredLibraries": list(REQUIRED_LIBRARIES),
        "unpackedKiB": unpacked_kib, "packedBytes": package.stat().st_size,
        "prefix": str(prefix),
        "checks": {},
    }

    def checked(label: str, *command: str, cwd: Path | None = None) -> None:
        try:
            run(*command, cwd=cwd, env=env, capture=False)
            report["checks"][label] = "passed"
        except subprocess.CalledProcessError:
            report["checks"][label] = "failed"
            raise
        finally:
            (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")

    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2), flush=True)
    version_output = run(str(binary), "--version", env=env)
    print(version_output, flush=True)
    report["checks"]["version"] = "passed" if manifest["version"] in version_output else "failed"
    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    if report["checks"]["version"] != "passed":
        raise ValueError(f"Relocated binary version differs from pin {manifest['version']}: {version_output}")
    checked(
        "libbf-bigint", str(binary), "--on-error=halt", "-q", "-g",
        "current_prolog_flag(bounded,false), \\+ current_prolog_flag(gmp_version,_), "
        "X is 2^128, X > 100000000000000000000000000000000000000, halt(0)",
        "-t", "halt(1)",
    )
    for name in REQUIRED_LIBRARIES:
        checked(
            f"library:{name}", str(binary), "--on-error=halt", "-q", "-g",
            f"use_module(library('{name}')), halt(0)", "-t", "halt(1)",
        )
    checked("build", "bun", "run", "build", cwd=ROOT)
    checked(
        "prologSuite", str(binary), "-q", "-s", "scripts/run-prolog-coverage.pl",
        "--", "--source-root", "packages/core/src",
        "--test", "packages/core/tests/kb.plt",
        "--test", "packages/core/tests/logic_ir.plt",
        "--test", "packages/core/tests/schema.plt",
        "--output-dir", "coverage/prolog", "--summary-json", "coverage/prolog/summary.json",
        "--summary-text", "coverage/prolog/summary.txt", "--fail-under", "50",
        cwd=ROOT,
    )
    checked(
        "cliSuite", "bun", "test", "--timeout", "120000", "--isolate",
        "--max-concurrency=1", "./packages/cli", cwd=ROOT,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify-config", "build-and-test"))
    parser.add_argument("--manifest", type=Path, default=Path(os.getenv("KIBI_SWIPL_SPIKE_MANIFEST", DEFAULT_MANIFEST)))
    parser.add_argument("--target", default=os.getenv("KIBI_SWIPL_SPIKE_TARGET", "linux-x64-gnu"))
    parser.add_argument("--workdir", type=Path)
    args = parser.parse_args()
    manifest = validate(args.manifest, args.target)
    if args.command == "verify-config":
        print(json.dumps({
            "target": args.target, "version": manifest["version"],
            "dependencies": {name: pin(manifest, name)["version"] for name in ("openssl", "pcre2", "zlib")},
            "requiredLibraries": list(REQUIRED_LIBRARIES),
        }))
        return
    if args.workdir is None:
        raise ValueError("--workdir is required for build-and-test")
    prefix = build(manifest, args.target, args.workdir)
    exercise(prefix, manifest, args.target, args.workdir.resolve())


if __name__ == "__main__":
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as error:
        print(f"SWI spike failed: {error}", file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError) and error.output:
            print(error.output, file=sys.stderr)
        sys.exit(1)
