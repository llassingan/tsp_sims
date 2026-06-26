// PostCSS pipeline for the TSP Simulator POC.
// - tailwindcss: compiles utility classes from `tailwind.config.ts` into the final CSS bundle,
//   including the custom `tsp-*` color palette used across the simulator visualization.
// - autoprefixer: adds vendor prefixes (e.g. `-webkit-`, `-moz-`) so CSS features like
//   `backdrop-filter` and `appearance` work across supported browsers without manual prefixing.
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
