#!/usr/bin/env python3
"""Pinned SWI-Prolog builds and relocation checks. Native builds run only in Actions."""

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
import struct
import sys
import tarfile
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from itertools import islice
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = Path(__file__).with_name("swipl-version.json")
TARGETS = {
    "linux-x64-gnu": ("linux", "x86_64"),
    "linux-arm64-gnu": ("linux", "aarch64"),
    "darwin-arm64": ("darwin", "arm64"),
    "darwin-x64": ("darwin", "x86_64"),
}
OPENSSL_TARGETS = {
    "linux-x64-gnu": "linux-x86_64",
    "linux-arm64-gnu": "linux-aarch64",
    "darwin-arm64": "darwin64-arm64-cc",
    "darwin-x64": "darwin64-x86_64-cc",
}
LINUX_LOADERS = {
    "linux-x64-gnu": "ld-linux-x86-64.so.2",
    "linux-arm64-gnu": "ld-linux-aarch64.so.1",
}
REQUIRED_LIBRARIES = (
    "semweb/rdf_db", "semweb/rdf_persistency", "semweb/sparql_client",
    "pcre", "crypto", "sha", "http/json", "http/json_convert",
    "chr", "clpfd", "thread", "persistency", "filesex", "readutil",
    "date", "aggregate", "solution_sequences", "prolog_coverage",
)
REQUIRED_LIBRARY_PATHS = {
    "semweb/rdf_db": "ext/semweb/semweb/rdf_db.pl",
    "semweb/rdf_persistency": "ext/semweb/semweb/rdf_persistency.pl",
    "semweb/sparql_client": "ext/semweb/semweb/sparql_client.pl",
    "pcre": "ext/pcre/pcre.pl",
    "crypto": "ext/ssl/crypto.pl",
    "sha": "ext/clib/sha.pl",
    "http/json": "ext/json/http/json.pl",
    "http/json_convert": "ext/json/http/json_convert.pl",
    "chr": "ext/chr/chr.pl",
    "clpfd": "clp/clpfd.pl",
    "thread": "thread.pl",
    "persistency": "persistency.pl",
    "filesex": "ext/clib/filesex.pl",
    "readutil": "readutil.pl",
    "date": "date.pl",
    "aggregate": "aggregate.pl",
    "solution_sequences": "solution_sequences.pl",
    "prolog_coverage": "prolog_coverage.pl",
}
PACKAGE_LIST = "chr;clib;http;plunit;semweb;pcre;ssl"
BUILD_JOBS = min(4, os.cpu_count() or 2)
LINUX_SYSTEM_LIBRARIES = {
    "libc.so.6", "libm.so.6", "libpthread.so.0", "libdl.so.2",
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


def linux_process_metadata(pid: int) -> dict | None:
    """Read process state only; never inspect argv, environment or payloads."""
    proc = Path("/proc") / str(pid)
    try:
        stat = (proc / "stat").read_text()
        end = stat.rfind(")")
        fields = stat[end + 2:].split()
        status = (proc / "status").read_text().splitlines()
        rss = next((line.split()[1] for line in status if line.startswith("VmRSS:")), "0")
        return {
            "pid": pid, "ppid": int(fields[1]),
            "comm": stat[stat.find("(") + 1:end], "state": fields[0],
            "startTicks": int(fields[19]),
            "userTicks": int(fields[11]), "systemTicks": int(fields[12]),
            "rssKiB": int(rss), "threads": int(fields[17]),
            "fdCount": sum(1 for _ in (proc / "fd").iterdir()),
            "wchan": (proc / "wchan").read_text().strip(),
        }
    except (OSError, ValueError, IndexError):
        # A process may exit between any of these reads.
        return None


def linux_process_children(pid: int) -> tuple[list[int], dict]:
    """A child belongs to the spawning thread, which need not be the leader."""
    children: set[int] = set()
    errors: dict[str, int] = {}
    task_limit = False
    child_limit = False
    tasks = []
    try:
        tasks = list(islice((Path("/proc") / str(pid) / "task").iterdir(), 257))
        task_limit = len(tasks) > 256
        for task in tasks[:256]:
            try:
                for child in (task / "children").read_text().split():
                    if len(children) >= 256:
                        child_limit = True
                        break
                    children.add(int(child))
            except (OSError, ValueError) as error:
                name = type(error).__name__
                errors[name] = errors.get(name, 0) + 1
    except OSError as error:
        errors[type(error).__name__] = 1
    return sorted(children), {
        "tasksInspected": min(len(tasks), 256), "taskLimitReached": task_limit,
        "childLimitReached": child_limit, "readErrors": errors,
    }


def sample_linux_cli(pid: int, destination: Path, stopped: threading.Event) -> None:
    """Bounded, best-effort evidence; an exited parent never owns child cleanup."""
    tracked: dict[int, int] = {}
    started = time.monotonic()
    peak = 0
    byte_count = 0
    try:
        with destination.open("w") as output:
            for index in range(7200):
                pending = [pid, *tracked]
                seen: set[int] = set()
                processes = []
                while pending and len(processes) < 256:
                    current = pending.pop(0)
                    if current in seen:
                        continue
                    seen.add(current)
                    metadata = linux_process_metadata(current)
                    if metadata is None:
                        continue
                    previous_start = tracked.get(current)
                    if previous_start is not None and previous_start != metadata["startTicks"]:
                        continue
                    children, discovery = linux_process_children(current)
                    metadata["childDiscovery"] = discovery
                    processes.append(metadata)
                    pending.extend(children)
                # Keep observed children after daemon reparenting, only while
                # that PID/start identity lives. This retains metadata, never
                # a process, descriptor, signal or process-group attachment.
                tracked = {item["pid"]: item["startTicks"] for item in processes}
                peak = max(peak, len(processes))
                sample = {
                    "timestampUtc": datetime.now(timezone.utc).isoformat(),
                    "elapsedSeconds": round(time.monotonic() - started, 3),
                    "rootPid": pid, "processes": processes,
                    "peakProcessCount": peak, "processLimitReached": bool(pending),
                    "sampleLimitReached": index == 7199, "final": stopped.is_set(),
                    "loadAverage": list(os.getloadavg()),
                }
                try:
                    memory = Path("/proc/meminfo").read_text().splitlines()
                    sample["memAvailableKiB"] = next(
                        int(line.split()[1]) for line in memory if line.startswith("MemAvailable:")
                    )
                    sample["fileNr"] = [int(value) for value in Path("/proc/sys/fs/file-nr").read_text().split()]
                except (OSError, ValueError, StopIteration) as error:
                    sample["resourceReadError"] = type(error).__name__
                encoded = json.dumps(sample) + "\n"
                if byte_count + len(encoded.encode()) > 16 * 1024 * 1024:
                    output.write(json.dumps({"diagnosticByteLimitReached": True}) + "\n")
                    output.flush()
                    break
                output.write(encoded)
                output.flush()
                byte_count += len(encoded.encode())
                if sample["final"]:
                    break
                stopped.wait(1)
    except Exception as error:
        # Diagnostics must never change the CLI exit result, even if the
        # destination is unavailable or a platform metadata read fails.
        print(f"CLI diagnostics unavailable ({type(error).__name__})", file=sys.stderr, flush=True)


def run_monitored_cli(
    *command: str, cwd: Path, env: dict[str, str], diagnostics: Path,
) -> None:
    print("+", shlex.join(str(part) for part in command), flush=True)
    stopped = threading.Event()
    with subprocess.Popen([str(part) for part in command], cwd=cwd, env=env) as child:
        monitor = threading.Thread(
            target=sample_linux_cli, args=(child.pid, diagnostics, stopped), daemon=True,
        )
        try:
            monitor.start()
        except RuntimeError as error:
            print(f"CLI diagnostics unavailable ({type(error).__name__})", file=sys.stderr, flush=True)
        try:
            result = child.wait()
        finally:
            stopped.set()
            if monitor.is_alive():
                monitor.join(timeout=2)
    if result:
        raise subprocess.CalledProcessError(result, [str(part) for part in command])


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
    patches = manifest.get("patches")
    if not isinstance(patches, list) or not patches:
        raise ValueError("SWI spike pin manifest must contain checked source patches")
    for patch in patches:
        if not isinstance(patch, dict):
            raise ValueError("Invalid source patch entry")
        patch_path = patch.get("path")
        digest = patch.get("sha256")
        files = patch.get("files")
        if not isinstance(patch_path, str) or not (ROOT / patch_path).resolve().is_relative_to(ROOT / "scripts" / "patches"):
            raise ValueError("Source patch path must remain in scripts/patches")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"Invalid source patch SHA-256: {patch_path}")
        try:
            actual = hashlib.sha256((ROOT / patch_path).read_bytes()).hexdigest()
        except OSError as error:
            raise ValueError(f"Cannot read source patch: {patch_path}") from error
        if actual != digest:
            raise ValueError(f"Source patch SHA-256 mismatch: {patch_path}")
        if not isinstance(files, dict) or not files:
            raise ValueError(f"Source patch must declare original and patched file hashes: {patch_path}")
        for name, hashes in files.items():
            if not isinstance(name, str) or Path(name).is_absolute() or ".." in Path(name).parts:
                raise ValueError(f"Invalid source patch file: {name}")
            if not isinstance(hashes, dict) or any(not isinstance(hashes.get(state), str) or not re.fullmatch(r"[0-9a-f]{64}", hashes[state]) for state in ("original", "patched")):
                raise ValueError(f"Invalid source patch file hashes: {name}")
    return manifest


class DownloadDigestMismatch(ValueError):
    pass


DOWNLOAD_ATTEMPTS = 4
DOWNLOAD_BACKOFF_SECONDS = 2.0


def download_archive(url: str, archive: Path, digest: str | None = None, attempts: int = DOWNLOAD_ATTEMPTS, backoff: float = DOWNLOAD_BACKOFF_SECONDS) -> None:
    """Fetch a pinned source archive, retrying transient server and network failures.

    With a digest, a download whose SHA-256 differs is discarded and retried too:
    a mirror can answer 200 with an error page. Only bytes matching the pin are
    ever kept, so a retry can never change what is built.
    """
    partial = archive.with_name(f"{archive.name}.part")
    for attempt in range(1, attempts + 1):
        print(f"Downloading {url}" + (f" (attempt {attempt}/{attempts})" if attempt > 1 else ""), flush=True)
        try:
            urllib.request.urlretrieve(url, partial)
            if digest is not None:
                actual = hashlib.sha256(partial.read_bytes()).hexdigest()
                if actual != digest:
                    raise DownloadDigestMismatch(f"{archive.name} SHA-256 mismatch: expected {digest}, got {actual}")
            partial.replace(archive)
            return
        except urllib.error.HTTPError as error:
            partial.unlink(missing_ok=True)
            if error.code < 500 and error.code != 429 or attempt == attempts:
                raise
            reason = f"HTTP {error.code}"
        except (urllib.error.URLError, TimeoutError, ConnectionError, DownloadDigestMismatch) as error:
            partial.unlink(missing_ok=True)
            if attempt == attempts:
                raise
            reason = str(getattr(error, "reason", error))
        delay = backoff * (2 ** (attempt - 1))
        print(f"Download failed ({reason}); retrying in {delay:g}s", flush=True)
        time.sleep(delay)


def source_archive(work: Path, name: str, version: str, digest: str, url: str) -> Path:
    archive = work / "downloads" / f"{name}-{version}.tar.gz"
    archive.parent.mkdir(parents=True, exist_ok=True)
    if not archive.exists():
        download_archive(url, archive, digest)
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


def apply_source_patches(source: Path, manifest: dict) -> None:
    for patch in manifest["patches"]:
        patch_path = ROOT / patch["path"]
        if hashlib.sha256(patch_path.read_bytes()).hexdigest() != patch["sha256"]:
            raise ValueError(f"Source patch SHA-256 mismatch: {patch['path']}")
        states = []
        for name, hashes in patch["files"].items():
            file = source / name
            try:
                if file.is_symlink() or not file.resolve().is_relative_to(source.resolve()):
                    raise ValueError(f"Source patch file escapes source tree: {name}")
                actual = hashlib.sha256(file.read_bytes()).hexdigest()
            except OSError as error:
                raise ValueError(f"Cannot read source patch file: {name}") from error
            states.append("original" if actual == hashes["original"] else "patched" if actual == hashes["patched"] else "unknown")
        if all(state == "patched" for state in states):
            print(f"Source patch already applied: {patch['path']} ({patch['sha256']})", flush=True)
            continue
        if any(state != "original" for state in states):
            raise ValueError(f"Source patch refuses unknown or partially patched source: {patch['path']}")
        listed = run("git", "apply", "--numstat", str(patch_path), cwd=source)
        paths = {line.split("\t", 2)[2] for line in listed.splitlines()}
        if paths != set(patch["files"]):
            raise ValueError(f"Source patch file inventory differs from pin: {patch['path']}")
        run("git", "apply", "--check", str(patch_path), cwd=source)
        run("git", "apply", str(patch_path), cwd=source)
        for name, hashes in patch["files"].items():
            if hashlib.sha256((source / name).read_bytes()).hexdigest() != hashes["patched"]:
                raise ValueError(f"Patched source SHA-256 mismatch: {name}")
        print(f"Applied checked source patch: {patch['path']} ({patch['sha256']})", flush=True)


def cmake_project(source: Path, build: Path, install: Path, target: str, *options: str) -> None:
    flags = [
        "-DCMAKE_BUILD_TYPE=Release", f"-DCMAKE_INSTALL_PREFIX={install}",
        "-DCMAKE_INSTALL_LIBDIR=lib", "-DBUILD_SHARED_LIBS=ON",
    ]
    if target.startswith("darwin"):
        flags.append("-DCMAKE_OSX_DEPLOYMENT_TARGET=12.0")
        flags.append(f"-DCMAKE_OSX_ARCHITECTURES={TARGETS[target][1]}")
    run("cmake", "-S", str(source), "-B", str(build), *flags, *options, capture=False)
    run("cmake", "--build", str(build), "--parallel", str(BUILD_JOBS), capture=False)
    run("cmake", "--install", str(build), capture=False)


def library(deps: Path, stem: str, target: str) -> Path:
    suffix = ".dylib" if target.startswith("darwin") else ".so"
    candidate = deps / "lib" / f"lib{stem}{suffix}"
    if not candidate.exists():
        raise ValueError(f"Missing vendored library: {candidate}")
    return candidate


def require_clean_runner(target: str, *, native_build: bool = False) -> None:
    if native_build and os.getenv("GITHUB_ACTIONS") != "true":
        raise ValueError("SWI native spike builds are allowed only in GitHub Actions")
    if target not in TARGETS:
        raise ValueError(f"Unsupported SWI spike target: {target}")
    actual_os = "darwin" if sys.platform == "darwin" else sys.platform
    expected = TARGETS[target]
    actual = (actual_os, platform.machine())
    if actual != expected:
        raise ValueError(f"Runner is {actual[0]}/{actual[1]}, expected {expected[0]}/{expected[1]}")
    if shutil.which("swipl"):
        raise ValueError("A system swipl is already on PATH; a clean runner is required")


def build(manifest: dict, target: str, work: Path) -> Path:
    require_clean_runner(target, native_build=True)
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
    openssl_target = OPENSSL_TARGETS[target]
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
    apply_source_patches(swipl, manifest)
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
        with path.open("rb") as file:
            magic = file.read(4)
        if magic in (b"\x7fELF", b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xca\xfe\xba\xbe", b"\xce\xfa\xed\xfe", b"\xfe\xed\xfa\xce"):
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
        audit_linux(files, prefix, target)
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
        audit_macos(files, prefix, target)


def check_native_architecture(path: Path, target: str) -> None:
    with path.open("rb") as file:
        header = file.read(20)
    if target.startswith("linux"):
        machine = 62 if target == "linux-x64-gnu" else 183
        valid = len(header) >= 20 and header[:6] == b"\x7fELF\x02\x01" and struct.unpack_from("<H", header, 18)[0] == machine
    else:
        cpu = 0x0100000c if target == "darwin-arm64" else 0x01000007
        valid = len(header) >= 8 and header[:4] == b"\xcf\xfa\xed\xfe" and struct.unpack_from("<I", header, 4)[0] == cpu
    if not valid:
        raise ValueError(f"Wrong native architecture for {target}: {path}")


def loader_environment() -> dict[str, str]:
    env = os.environ.copy()
    for key in [name for name in env if name.startswith(("LD_", "DYLD_"))]:
        env.pop(key, None)
    return env


def audit_linux(files: list[Path], prefix: Path, target: str = "linux-x64-gnu") -> None:
    vendor = prefix / "lib" / "vendor"
    permitted = LINUX_SYSTEM_LIBRARIES | {LINUX_LOADERS[target]}
    for path in files:
        check_native_architecture(path, target)
        dynamic = run("readelf", "-d", str(path))
        needed = re.findall(r"\(NEEDED\).*?\[(.*?)\]", dynamic)
        for name in needed:
            if name not in permitted and not name.startswith(VENDORED_LIBRARY_PREFIXES) and not name.startswith("libswipl.so"):
                raise ValueError(f"Forbidden ELF dependency in {path}: {name}")
        runpaths = re.findall(r"\((?:RUNPATH|RPATH)\).*?\[(.*?)\]", dynamic)
        if not runpaths:
            raise ValueError(f"Missing relative ELF runpath: {path}")
        for entry in runpaths:
            for value in entry.split(":"):
                if not value.startswith("$ORIGIN/"):
                    raise ValueError(f"Nonrelative ELF runpath: {path}: {value}")
                resolved = (path.parent / value.removeprefix("$ORIGIN/")).resolve()
                if not resolved.is_dir() or not resolved.is_relative_to(prefix.resolve()):
                    raise ValueError(f"Escaping or missing ELF runpath: {path}: {value}")
        versions = run("readelf", "--version-info", str(path))
        for version in re.findall(r"\bGLIBC_(\d+(?:\.\d+)+)\b", versions):
            if tuple(int(part) for part in version.split(".")) > (2, 28):
                raise ValueError(f"ELF requires glibc newer than 2.28: {path}: {version}")
        linked = run("ldd", str(path), env=loader_environment())
        if "not found" in linked:
            raise ValueError(f"Unresolved ELF dependency in {path}:\n{linked}")
        for line in linked.splitlines():
            line = line.strip()
            if not line or re.fullmatch(r"linux-vdso\.so\.1\s+\(0x[0-9a-f]+\)", line):
                continue
            match = re.fullmatch(r"(\S+)\s+=>\s+(/\S+)\s+\(0x[0-9a-f]+\)", line)
            if match:
                name, destination = match.groups()
            else:
                loader = re.fullmatch(r"(/\S+)\s+\(0x[0-9a-f]+\)", line)
                if not loader:
                    raise ValueError(f"Unrecognized ELF dependency result: {path}: {line}")
                destination = loader.group(1)
                name = Path(destination).name
            if name not in permitted and not name.startswith(VENDORED_LIBRARY_PREFIXES) and not name.startswith("libswipl.so"):
                raise ValueError(f"Forbidden transitive ELF dependency: {path}: {name}")
            resolved = Path(destination).resolve()
            if name.startswith(VENDORED_LIBRARY_PREFIXES):
                if not resolved.is_file() or not resolved.is_relative_to(vendor.resolve()):
                    raise ValueError(f"Dependency escaped vendor directory: {path}: {line}")
            if name.startswith("libswipl.so"):
                if not resolved.is_file() or not resolved.is_relative_to(prefix.resolve()):
                    raise ValueError(f"libswipl escaped relocated prefix: {path}: {line}")


def audit_macos(files: list[Path], prefix: Path, target: str = "darwin-arm64") -> None:
    for path in files:
        check_native_architecture(path, target)
        output = run("otool", "-L", str(path))
        for line in output.splitlines()[1:]:
            dependency = line.strip().split(" (", 1)[0]
            if dependency and not dependency.startswith(("@loader_path/", "/usr/lib/", "/System/Library/")):
                raise ValueError(f"Unrelocated Mach-O dependency in {path}: {dependency}")
            if dependency.startswith("@loader_path/"):
                resolved = (path.parent / dependency.removeprefix("@loader_path/")).resolve()
                if not resolved.is_file() or not resolved.is_relative_to(prefix.resolve()):
                    raise ValueError(f"Unresolved or escaping Mach-O dependency: {path}: {dependency}")
        commands = run("otool", "-l", str(path))
        versions = []
        for block in re.split(r"(?=\bcmd LC_)", commands):
            if "cmd LC_BUILD_VERSION" in block:
                versions.extend(re.findall(r"\bminos\s+(\d+)\.(\d+)", block))
            elif "cmd LC_VERSION_MIN_MACOSX" in block:
                versions.extend(re.findall(r"\bversion\s+(\d+)\.(\d+)", block))
        if not versions:
            raise ValueError(f"Mach-O deployment target is missing: {path}")
        if any((int(major), int(minor)) > (12, 0) for major, minor in versions):
            raise ValueError(f"Mach-O deployment target exceeds macOS 12: {path}: {versions}")
        run("codesign", "--verify", "--strict", str(path))


def checked(report: dict, work: Path, env: dict[str, str], label: str, *command: str, cwd: Path | None = None) -> None:
    try:
        if label == "cliSuite" and report["target"] == "linux-x64-gnu":
            run_monitored_cli(*command, cwd=cwd or ROOT, env=env, diagnostics=work / "cli-process-samples.jsonl")
        else:
            run(*command, cwd=cwd, env=env, capture=False)
        report["checks"][label] = "passed"
    except subprocess.CalledProcessError:
        report["checks"][label] = "failed"
        raise
    finally:
        (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")


def smoke(prefix: Path, manifest: dict, target: str, work: Path, report: dict) -> dict[str, str]:
    binary = prefix / "bin" / "swipl"
    home = prefix / "lib" / "swipl"
    if not binary.is_file() or not home.is_dir():
        raise ValueError(f"Incomplete relocated prefix: {binary} / {home}")
    env = loader_environment()
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
    version_output = run(str(binary), "--version", env=env)
    print(version_output, flush=True)
    version = re.match(r"SWI-Prolog version (\d+\.\d+\.\d+)(?:\s|$)", version_output)
    report["checks"]["version"] = "passed" if version and version.group(1) == manifest["version"] else "failed"
    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    if report["checks"]["version"] != "passed":
        raise ValueError(f"Relocated binary version differs from pin {manifest['version']}: {version_output}")
    checked(report, work, env,
        "libbf-bigint", str(binary), "--on-error=halt", "-q", "-g",
        "current_prolog_flag(bounded,false), \\+ current_prolog_flag(gmp_version,_), "
        "X is 2^128, X > 100000000000000000000000000000000000000, halt(0)",
        "-t", "halt(1)",
    )
    timestamp_files = [work / "mtime-first", work / "mtime-second"]
    for file, fractional_ns in zip(timestamp_files, (125_000_000, 875_000_000)):
        file.write_text("relocated timestamp precision control\n")
        timestamp_ns = 1_600_000_000_000_000_000 + fractional_ns
        os.utime(file, ns=(timestamp_ns, timestamp_ns))
    quoted = [str(file).replace("'", "''") for file in timestamp_files]
    checked(report, work, env,
        "file-mtime-subsecond", str(binary), "--on-error=halt", "-q", "-g",
        f"time_file('{quoted[0]}',A), time_file('{quoted[1]}',B), "
        "format('same-second file times: ~16f ~16f~n',[A,B]), "
        "abs(A-1600000000.125)<0.000001, abs(B-1600000000.875)<0.000001, "
        "D is B-A, D>0.749999, D<0.750001, halt(0)", "-t", "halt(1)",
    )
    for name in REQUIRED_LIBRARIES:
        checked(report, work, env,
            f"library:{name}", str(binary), "--on-error=halt", "-q", "-g",
            f"use_module(library('{name}')), halt(0)", "-t", "halt(1)",
        )
    return env


def exercise(prefix: Path, manifest: dict, target: str, work: Path) -> None:
    binary = prefix / "bin" / "swipl"
    package = work / "swipl-relocated.tar.gz"
    run("tar", "-czf", str(package), "-C", str(prefix), ".", capture=False)
    unpacked_kib = int(run("du", "-sk", str(prefix)).split()[0])
    report = {
        "target": target, "swiplVersion": manifest["version"],
        "sourceArchiveSha256": manifest["sha256"],
        "sourcePatches": manifest["patches"],
        "requiredLibraries": list(REQUIRED_LIBRARIES),
        "unpackedKiB": unpacked_kib, "packedBytes": package.stat().st_size,
        "prefix": str(prefix),
        "checks": {},
    }

    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2), flush=True)
    env = smoke(prefix, manifest, target, work, report)
    checked(report, work, env, "build", "bun", "run", "build", cwd=ROOT)
    checked(report, work, env,
        "prologSuite", str(binary), "-q", "-s", "scripts/run-prolog-coverage.pl",
        "--", "--source-root", "packages/core/src",
        "--test", "packages/core/tests/kb.plt",
        "--test", "packages/core/tests/logic_ir.plt",
        "--test", "packages/core/tests/schema.plt",
        "--output-dir", "coverage/prolog", "--summary-json", "coverage/prolog/summary.json",
        "--summary-text", "coverage/prolog/summary.txt", "--fail-under", "50",
        cwd=ROOT,
    )
    checked(report, work, env,
        "cliSuite", "bun", "test", "--timeout", "120000", "--isolate",
        "--max-concurrency=1", "./packages/cli", cwd=ROOT,
    )


def build_manifest(prefix: Path, manifest: dict, target: str) -> dict:
    binary = prefix / "bin" / "swipl"
    if not binary.is_file() or binary.is_symlink():
        raise ValueError("Build prefix must contain a regular bin/swipl")
    return {
        "schema": "kibi.swipl-build.v1", "target": target,
        "swiplVersion": manifest["version"],
        "sourceArchiveSha256": manifest["sha256"],
        "dependencies": manifest["dependencies"], "sourcePatches": manifest["patches"],
        "sourceCommit": os.getenv("GITHUB_SHA"), "workflowRunId": os.getenv("GITHUB_RUN_ID"),
        "binary": {"path": "bin/swipl", "sha256": hashlib.sha256(binary.read_bytes()).hexdigest()},
        "home": "lib/swipl", "requiredLibraries": list(REQUIRED_LIBRARIES),
    }


def write_archive(prefix: Path, manifest: dict, target: str, work: Path) -> Path:
    metadata = build_manifest(prefix, manifest, target)
    (prefix / "build-manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
    archive = work / f"swipl-{manifest['version']}-{target}.tar.gz"
    run("tar", "-czf", str(archive), "-C", str(prefix), ".", capture=False)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_name(archive.name + ".sha256").write_text(f"{digest}  {archive.name}\n")
    return archive


def verify_archive(archive: Path, checksum: Path, manifest: dict, target: str, work: Path) -> Path:
    expected_name = f"swipl-{manifest['version']}-{target}.tar.gz"
    if archive.name != expected_name:
        raise ValueError(f"Archive name does not match target/version: {archive.name}")
    declared = checksum.read_text(encoding="ascii")
    if not re.fullmatch(r"[0-9a-f]{64}  " + re.escape(expected_name) + r"\n?", declared):
        raise ValueError("Invalid archive SHA-256 sidecar")
    if hashlib.sha256(archive.read_bytes()).hexdigest() != declared[:64]:
        raise ValueError("Archive SHA-256 mismatch")
    destination = work / "extracted"
    if destination.exists() or destination.is_symlink():
        raise ValueError(f"Archive destination must be new: {destination}")
    with tarfile.open(archive, "r:gz") as tar:
        entries = {}
        for member in tar.getmembers():
            parts = member.name.split("/")
            if member.name.startswith("/") or ".." in parts:
                raise ValueError(f"Archive path escapes prefix: {member.name}")
            name = os.path.normpath(member.name)
            if name in entries:
                raise ValueError(f"Duplicate archive member: {name}")
            if name == ".":
                if not member.isdir() or member.mode & 0o7000:
                    raise ValueError("Archive root must be an unprivileged directory")
                entries[name] = member
                continue
            if name.split("/", 1)[0] not in ("bin", "lib", "licenses", "share", "build-manifest.json"):
                raise ValueError(f"Unexpected archive entry: {name}")
            if not (member.isfile() or member.isdir() or member.issym()) or member.mode & 0o7000:
                raise ValueError(f"Unsafe archive entry type or mode: {name}")
            entries[name] = member
        for name, member in entries.items():
            for parent in Path(name).parents:
                if str(parent) in entries and not entries[str(parent)].isdir():
                    raise ValueError(f"Archive parent is not a directory: {name}")
            if member.issym():
                current = name
                seen = set()
                while current in entries and entries[current].issym():
                    if current in seen:
                        raise ValueError(f"Archive symlink cycle: {name}")
                    seen.add(current)
                    link = entries[current].linkname
                    if Path(link).is_absolute():
                        raise ValueError(f"Archive symlink escapes prefix: {name}")
                    current = os.path.normpath(str(Path(current).parent / link))
                    if current == ".." or current.startswith("../"):
                        raise ValueError(f"Archive symlink escapes prefix: {name}")
                if current not in entries:
                    raise ValueError(f"Archive symlink is dangling: {name}")
        for name in ("build-manifest.json", "bin/swipl"):
            if name not in entries or not entries[name].isfile():
                raise ValueError(f"Archive is missing a regular {name}")
        expected = build_manifest_values(manifest, target)
        metadata = json.loads(tar.extractfile(entries["build-manifest.json"]).read())
        if not isinstance(metadata, dict):
            raise ValueError("Invalid build manifest")
        if set(metadata) != set(expected) | {"binary", "sourceCommit", "workflowRunId"}:
            raise ValueError("Unexpected build manifest keys")
        for key, value in expected.items():
            if metadata.get(key) != value:
                raise ValueError(f"Build manifest differs from trusted pin: {key}")
        binary = metadata.get("binary")
        if not isinstance(binary, dict) or set(binary) != {"path", "sha256"} or binary.get("path") != "bin/swipl":
            raise ValueError("Invalid build manifest binary path")
        if hashlib.sha256(tar.extractfile(entries["bin/swipl"]).read()).hexdigest() != binary.get("sha256"):
            raise ValueError("Binary SHA-256 mismatch")
        for key, variable in (("sourceCommit", "GITHUB_SHA"), ("workflowRunId", "GITHUB_RUN_ID")):
            if os.getenv(variable) and metadata.get(key) != os.getenv(variable):
                raise ValueError(f"Build provenance differs from this Actions run: {key}")
        for license in ("SWI-Prolog-LICENSE", "OpenSSL-LICENSE.txt", "PCRE2-COPYING", "zlib-LICENSE"):
            member = entries.get("licenses/" + license)
            if member is None or not member.isfile() or member.size == 0:
                raise ValueError(f"Archive is missing license: {license}")
        if not any(name.startswith("lib/swipl/") and member.isdir() for name, member in entries.items()):
            raise ValueError("Archive is missing SWI home")
        for library in REQUIRED_LIBRARIES:
            member = entries.get("lib/swipl/library/" + REQUIRED_LIBRARY_PATHS[library])
            if member is None or not member.isfile():
                raise ValueError(f"Archive is missing required library: {library}")
        # Every path/link and its parent was checked before creating anything.
        # A fresh destination prevents an existing symlink from changing extraction.
        destination.mkdir(parents=True)
        tar.extractall(destination)
    return destination


def build_manifest_values(manifest: dict, target: str) -> dict:
    return {
        "schema": "kibi.swipl-build.v1", "target": target,
        "swiplVersion": manifest["version"], "sourceArchiveSha256": manifest["sha256"],
        "dependencies": manifest["dependencies"], "sourcePatches": manifest["patches"],
        "home": "lib/swipl", "requiredLibraries": list(REQUIRED_LIBRARIES),
    }


def archive_pipeline(manifest: dict, target: str, work: Path, archive: Path | None = None, checksum: Path | None = None) -> None:
    require_clean_runner(target, native_build=archive is None)
    work = work.resolve()
    work.mkdir(parents=True, exist_ok=True)
    report = {**build_manifest_values(manifest, target), "sourceCommit": os.getenv("GITHUB_SHA"), "workflowRunId": os.getenv("GITHUB_RUN_ID"), "role": "consumer" if archive else "builder", "checks": {}, "status": "running"}
    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    stage = "build" if archive is None else "artifact-validation"
    try:
        if archive is None:
            prefix = build(manifest, target, work)
            metadata = build_manifest(prefix, manifest, target)
        else:
            if checksum is None:
                raise ValueError("--checksum is required for smoke-archive")
            prefix = verify_archive(archive, checksum, manifest, target, work)
            metadata = json.loads((prefix / "build-manifest.json").read_text())
        report.update(metadata)
        report["checks"][stage] = "passed"
        stage = "native-audit"
        files = native_files(prefix, target)
        if not files:
            raise ValueError("Archive prefix contains no native files")
        if target.startswith("linux"):
            audit_linux(files, prefix, target)
        else:
            audit_macos(files, prefix, target)
        report["checks"][stage] = "passed"
        stage = "smoke"
        smoke(prefix, manifest, target, work, report)
        stage = "archive"
        if archive is None:
            archive = write_archive(prefix, manifest, target, work)
            report.update(json.loads((prefix / "build-manifest.json").read_text()))
        report.update({"archive": archive.name, "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "packedBytes": archive.stat().st_size, "unpackedKiB": int(run("du", "-sk", str(prefix)).split()[0]), "status": "passed"})
        report["checks"].update({"artifact-sha256": "passed", "binary-sha256": "passed"})
    except (ValueError, OSError, tarfile.TarError, subprocess.CalledProcessError) as error:
        report["checks"][stage] = "failed"
        report["status"] = "failed"
        report["error"] = str(error)
        raise
    finally:
        (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify-config", "build-and-test", "build-archive", "smoke-archive", "extract-archive"))
    parser.add_argument("--manifest", type=Path, default=Path(os.getenv("KIBI_SWIPL_SPIKE_MANIFEST", DEFAULT_MANIFEST)))
    parser.add_argument("--target", default=os.getenv("KIBI_SWIPL_SPIKE_TARGET", "linux-x64-gnu"))
    parser.add_argument("--workdir", type=Path)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--checksum", type=Path)
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
        raise ValueError(f"--workdir is required for {args.command}")
    if args.command == "build-and-test":
        prefix = build(manifest, args.target, args.workdir)
        exercise(prefix, manifest, args.target, args.workdir.resolve())
    elif args.command == "build-archive":
        archive_pipeline(manifest, args.target, args.workdir)
    elif args.command == "extract-archive":
        # Release packaging: the same verification and safe extraction the
        # consumer smoke uses, without the native audit (which needs the
        # target's own architecture). Prints the extracted prefix.
        if args.archive is None or args.checksum is None:
            raise ValueError("--archive and --checksum are required for extract-archive")
        prefix = verify_archive(args.archive.resolve(), args.checksum.resolve(), manifest, args.target, args.workdir.resolve())
        print(json.dumps({"prefix": str(prefix)}))
    else:
        if args.archive is None or args.checksum is None:
            raise ValueError("--archive and --checksum are required for smoke-archive")
        archive_pipeline(manifest, args.target, args.workdir, args.archive.resolve(), args.checksum.resolve())


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, tarfile.TarError, subprocess.CalledProcessError) as error:
        print(f"SWI spike failed: {error}", file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError) and error.output:
            print(error.output, file=sys.stderr)
        sys.exit(1)
