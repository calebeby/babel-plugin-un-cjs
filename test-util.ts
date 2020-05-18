import { transformAsync as babelTransform } from '@babel/core'
import babelPlugin from './src'
import * as prettier from 'prettier'

const transform = async (inputCode: string) => {
  const result = await babelTransform(inputCode, {
    plugins: [babelPlugin],
    parserOpts: { plugins: ['jsx'] },
    configFile: false,
  })
  if (!result?.code) return '\n'
  const prettified = prettier.format(result.code, {
    parser: 'babel',
    singleQuote: true,
    semi: false,
    trailingComma: 'all',
  })

  if (prettified === '') return '\n'
  return prettified
}

export default transform
