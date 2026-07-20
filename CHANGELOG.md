# Changelog

All notable changes to Sturna are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Backtest mode: `npm run backtest` runs the full swarm over seeded,
  reproducible simulated history and reports return, alpha versus an
  equal-weight benchmark, Sharpe, max drawdown, turnover, fees, and Sentinel
  halts per mandate. Exposed programmatically as `runBacktest` in the library.

## [0.1.0] - 2026-07-20

### Added

- Six-agent swarm engine: Scout (sourcing), Analyst (five-factor scoring),
  Architect (portfolio construction), Sentinel (risk circuit-breaker),
  Executor (order routing), Steward (monitoring and drift).
- Deterministic paper-mode execution adapter with a stubbed `mcp-live` path
  targeting Robinhood's agentic trading MCP.
- Simulated universe of 14 tokenized private-market and real-world assets
  with seeded GBM price paths.
- Hono HTTP API (`npm run server`) and terminal cycle runner (`npm run cycle`).
- Library entry point (`sturna`) with typed exports for every agent stage,
  buildable to native ESM via `npm run build`.
- Vitest unit suite (43 tests) covering all agents, the orchestrator, and the
  engine; wired into CI.
- Examples: a custom "Curator" agent spliced into a hand-rolled pipeline, and
  a browser embed running the whole swarm client-side.
- Open-source scaffolding: MIT license, contributing guide, code of conduct,
  security policy, issue and PR templates, CI and release workflows.

[Unreleased]: https://github.com/tylerbroqs/sturna/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tylerbroqs/sturna/releases/tag/v0.1.0
