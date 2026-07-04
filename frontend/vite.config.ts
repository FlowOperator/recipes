import { defineConfig } from 'vite';

// Repo is served at https://flowoperator.github.io/recipes/ via GitHub Pages,
// so all built asset URLs need this base path prefix.
export default defineConfig({
  base: '/recipes/',
});
