import sucrase from '@rollup/plugin-sucrase'
import resolve from '@rollup/plugin-node-resolve'

export default {
  input: 'src/index.ts',
  output: {
    format: 'cjs',
    file: 'dist/index.js',
  },
  external: ['@babel/core', '@babel/helper-plugin-utils'],
  plugins: [
    resolve({
      extensions: ['.js', '.ts'],
    }),
    sucrase({
      transforms: ['typescript'],
    }),
  ],
}
