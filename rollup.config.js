import sucrase from '@rollup/plugin-sucrase'
import resolve from '@rollup/plugin-node-resolve'
import dts from 'rollup-plugin-dts'

const watch = process.env.ROLLUP_WATCH

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js', format: 'cjs' },
      { file: 'dist/index.mjs', format: 'esm' },
    ],
    external: ['@babel/core', '@babel/helper-plugin-utils'],
    plugins: [
      resolve({
        extensions: ['.js', '.ts'],
      }),
      sucrase({
        transforms: ['typescript'],
      }),
    ],
  },
  !watch && {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
].filter(Boolean)
