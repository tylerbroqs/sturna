# Security Policy

## Supported versions

Sturna is pre-1.0; only the latest `main` is supported with security fixes.

## Scope

Sturna ships in **paper mode** — no credentials, no real orders. The
security-sensitive surface is small but real:

- Handling of `RH_MCP_TOKEN` and the `mcp-live` execution path
- The Hono API server (`src/server/`)
- Dependency supply chain (npm)

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Instead, use GitHub's [private vulnerability reporting](https://github.com/tylerbroqs/sturna/security/advisories/new)
for this repository. Include a description of the issue, steps to reproduce,
and the potential impact.

You can expect an acknowledgement within a few days. Once a fix is available
we will credit reporters in the release notes unless you prefer to stay
anonymous.

## A note on live trading

If you fork Sturna and wire it to a live venue, **you own that risk surface**:
token storage, order authorization, and rate limiting are intentionally left
to the integrator. Never commit `.env` files or MCP tokens.
