# Contributing to Sturna

Thanks for your interest in improving Sturna! This document covers everything you need to get a change from idea to merged PR.

## Ground rules

- Be respectful — we follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Paper mode stays the default.** Nothing merged to `main` may place real orders or require credentials to run.
- Keep the core engine (`src/core/`) framework-free: it must run identically in Node and the browser.

## Getting set up

```bash
git clone https://github.com/tylerbroqs/sturna.git
cd sturna
npm install                 # engine + API deps
```

Useful commands:

| Command | What it does |
|---------|--------------|
| `npm test` | Run the Vitest unit suite (agents, engine, orchestrator) |
| `npm run test:watch` | Run the tests in watch mode while developing |
| `npm run cycle` | Run one full swarm cycle in the terminal — the fastest smoke test |
| `npm run server` | Start the Hono API with hot reload on :8787 |
| `npm run typecheck` | Typecheck the engine + server |

## Making changes

1. Fork the repo and create a branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Make your change. Match the existing code style — small modules, explicit types, no new runtime dependencies in `src/core/` without discussion.
3. Verify before pushing:
   ```bash
   npm run typecheck && npm test && npm run cycle
   ```
   Add or update tests under `test/` for any behavior you change.
4. Open a pull request. Describe **what** changed and **why**; terminal output is appreciated for engine behavior changes.

## What makes a good contribution

- **Risk models** — extend the Sentinel (expected shortfall, stress scenarios, correlation clusters).
- **Factor research** — new scoring signals in the Analyst.
- **Execution venues** — additional adapters alongside `RobinhoodAdapter` (keep the `paper` / live split).
- **Universe realism** — richer simulated dynamics (jumps, liquidity shocks, valuation gaps).
- **Docs** — clarifications, tutorials, architecture notes.

For anything large or architectural (a new agent, changing the handoff pipeline, a new venue protocol), please open an issue first so we can discuss the design before you invest time.

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/tylerbroqs/sturna/issues/new/choose). For security concerns, see [SECURITY.md](SECURITY.md) — please don't open public issues for vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
