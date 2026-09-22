import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',

  build: {
    outDir: '../dist',
    emptyOutDir: true,

    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              maxSize: 250_000,
            },
          ],
        },
      },
    },
  },
});
