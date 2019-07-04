import { transformAsync as babelTransform } from '@babel/core'
import babelPlugin from '../src'

const transform = async (inputCode: string) => {
  const result = await babelTransform(inputCode, {
    plugins: [babelPlugin],
    configFile: false,
  })
  return result.code
}

export default transform
