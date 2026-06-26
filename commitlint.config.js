// Conventional Commits enforcement for the TSP Simulator POC.
// Delegates to `@commitlint/config-conventional` which validates that every commit
// message follows the structure `type(scope?): description`, e.g.
//   feat(algorithms): add Nearest Neighbor heuristic
// Allowed types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert.
// This keeps the git history machine-readable so automated changelogs and semantic
// versioning tooling can parse it without ambiguity.
export default { extends: ['@commitlint/config-conventional'] };
