/**
 * Tailwind CSS configuration for the TSP Simulator POC.
 *
 * Content paths tell Tailwind which files to scan for utility class usage;
 * any class not found in these globs is purged from the production build.
 *
 * The `tsp` color palette is the visualization color scheme used across the
 * simulator canvas, tour tables, and algorithm panels. It follows the Wong
 * color-blind safe palette so that all TSP elements (nodes, edges, tours)
 * are distinguishable by viewers with common forms of color blindness:
 *
 *   - `node`:        black — default city marker fill
 *   - `current`:     yellow (#F0E442) — the node currently being examined
 *   - `start`:       orange (#E69F00) — the designated tour start node
 *   - `dest`:        pink (#CC79A7) — the designated tour destination node
 *   - `defaultEdge`: grey (#999999) — unvisited/pending edges
 *   - `currentTour`: sky blue (#56B4E9) — the tour currently being built
 *   - `bestTour`:    green (#009E73) — the best complete tour found so far
 *   - `explored`:    vermillion (#D55E00) — edges/nodes that have been explored
 *   - `pruned`:      dark grey (#777777) — branches pruned by B&B bounding
 *
 * No Tailwind plugins are needed; the design uses utility-first CSS only.
 */
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tsp: {
          node: '#000000',
          current: '#F0E442',
          start: '#E69F00',
          dest: '#CC79A7',
          defaultEdge: '#999999',
          currentTour: '#56B4E9',
          bestTour: '#009E73',
          explored: '#D55E00',
          pruned: '#777777',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
