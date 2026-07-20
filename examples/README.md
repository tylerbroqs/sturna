# Sturna examples

Small, self-contained demonstrations of the engine's two superpowers: it is
framework-free (runs anywhere JavaScript runs) and every agent is an exported,
composable function.

| Example | What it shows | Run |
|---------|---------------|-----|
| [`custom-agent/`](custom-agent/) | Writing your own agent (a volatility-vetoing "Curator") and splicing it into a hand-rolled swarm cycle | `npm run example:agent` |
| [`browser-embed/`](browser-embed/) | The entire engine running client-side in a plain HTML page — no server, no framework | `npm run example:browser`, then open `browser-embed/index.html` |

Both examples import from `src/` directly, so they always track the code in
this repository. If you are consuming the published npm package instead,
replace the relative import with:

```ts
import { Engine, runCycle } from "sturna";
```
