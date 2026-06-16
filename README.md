# TSP Simulator

Animated simulator for the Traveling Salesman Problem (TSP) and its Hamiltonian-path variant. Visualizes four algorithms — Brute Force, Branch & Bound, Held–Karp DP, and Nearest Neighbor — exploring the solution space step-by-step.

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:14022
```

## Production

```bash
pnpm build
pnpm start        # serves built bundle on :14022 + health API on :14045
```

Access via:
- Frontend: `https://staging.mahara.web.id:14022`
- API: `https://api-staging.mahara.web.id:14045/health`

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Vite dev server on `:14022` |
| `pnpm build` | Type-check and build production assets to `dist/` |
| `pnpm start` | Production server (frontend on `:14022`, health API on `:14045`) |
| `pnpm preview` | Preview the production build on `:14022` |
| `pnpm test` | Vitest watch mode |
| `pnpm test:run` | Vitest single run |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm e2e` | Playwright e2e |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm format` | Prettier |
| `pnpm size` | size-limit bundle check |
| `pnpm knip` / `pnpm ts-prune` | Dead-code detection |

## Algorithms

| Algorithm | Time | Space | Max recommended nodes |
|---|---|---|---|
| Brute Force | O(n!) | O(n) | 9 |
| Branch & Bound | O(n!) worst | O(n²) | 15 |
| Held–Karp DP | O(n²·2ⁿ) | O(n·2ⁿ) | 18 |
| Nearest Neighbor | O(n²) | O(n) | 200 (heuristic) |

See [`tsp-simulator.md`](./tsp-simulator.md) for the full design and [`tsp-simulator-backlog.md`](./tsp-simulator-backlog.md) for the implementation backlog.

## License

MIT
