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
