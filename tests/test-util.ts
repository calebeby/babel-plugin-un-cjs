import { transformAsync as babelTransform } from '@babel/core'
import babelPlugin from '../src'
import * as prettier from 'prettier'

const transform = async (inputCode: string) => {
  const result = await babelTransform(inputCode, {
    plugins: [babelPlugin],
    configFile: false,
  })
  return prettier.format(result.code, {
    parser: 'babel',
    singleQuote: true,
    semi: false,
    trailingComma: 'all',
  })
}

export default transform
