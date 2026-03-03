# Kibi Test Runner Docker Image
# Multi-stage build for running E2E and integration tests in isolation

# Base stage: SWI-Prolog 9.2+ with Node.js and Bun
FROM swipl:9.3.35 AS base

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    git \
    bash \
    build-essential \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (pinned version for reproducibility)
ENV BUN_VERSION=1.1.29
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
ENV PATH="/root/.bun/bin:${PATH}"

# Verify installations
RUN swipl --version && node --version && bun --version && git --version

# Create non-root user for running tests
RUN useradd -m -s /bin/bash kibi

# Set working directory
WORKDIR /workspace

# Environment defaults (can be overridden)
ENV NODE_ENV=test
ENV CI=1

# Dev stage: For bind-mount development workflow
FROM base AS dev

# Keep as root for bind-mount ergonomics, but we'll run as kibi in entrypoint
# Create directories for test isolation
RUN mkdir -p /tmp/kibi-tests && chmod 777 /tmp/kibi-tests

# CI stage: Copy-in for CI/CD
FROM base AS ci

# Copy the entire repo
COPY . /workspace

# Install dependencies and build
RUN bun install \
    && bun run build:cli \
    && bun run build:mcp

# Pre-verify the build
RUN swipl --version && echo "---" && node --version && echo "---" && bun --version

# Set ownership
RUN chown -R kibi:kibi /workspace

# Default to non-root user
USER kibi
