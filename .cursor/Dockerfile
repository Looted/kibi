# Cloud Agent base image for the Kibi monorepo.
#
# Bakes the stable, slow-to-install system toolchain so it is captured in the
# environment build snapshot: SWI-Prolog (the KB reasoning engine), Node.js,
# and a pinned Bun. Repository dependency installation lives in the `install`
# phase (see .cursor/install.sh), which runs after the source is checked out.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV BUN_INSTALL=/usr/local/bun
ENV PATH=/usr/local/bun/bin:${PATH}

# Base tooling plus SWI-Prolog (>= 9) from the official stable PPA, matching CI.
# bubblewrap is required by the strict-proof sandbox used in the proof pipeline.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      build-essential \
      python3 \
      gnupg \
      xz-utils \
      software-properties-common \
      bubblewrap \
 && add-apt-repository -y ppa:swi-prolog/stable \
 && apt-get update \
 && apt-get install -y --no-install-recommends swi-prolog \
 && rm -rf /var/lib/apt/lists/*

# Node.js 24 (matches the CI toolchain) from NodeSource.
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# Bun, pinned to the version CI uses. Symlink into PATH for every user/shell.
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.10" \
 && ln -sf /usr/local/bun/bin/bun /usr/local/bin/bun \
 && ln -sf /usr/local/bun/bin/bunx /usr/local/bin/bunx

# The ubuntu:24.04 image already ships a non-root `ubuntu` user (uid 1000),
# which the environment runs commands as (see .cursor/environment.json).
USER ubuntu
