import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js', // entry point for your modules
  output: {
    file: 'dist/bookmarklet.bundle.js',
    format: 'iife',
    name: 'countBookmarklet'
  },
  plugins: [resolve()]
};
