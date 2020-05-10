// @ts-check
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const THIS_FILE = fs.readFileSync(__filename)

/** @param {string[]} lines */
const getFrontMatter = (lines) => {
  /** @type {{[key: string]: string | number | boolean}} */
  const frontMatter = {}
  let isFrontMatter = false
  for (let line of lines) {
    if (line.trim() === '---') isFrontMatter = !isFrontMatter
    else if (isFrontMatter) {
      const [key, val] = line.split(':', 2)
      let value = val.trim().replace(/^['"]/, '').replace(/['"]$/, '')
      try {
        value = JSON.parse(value)
      } catch (e) {}
      frontMatter[key.trim()] = value
    }
  }
  return frontMatter
}

/** @param {string[]} lines */
const getCodeBlocks = (lines) => {
  /** @type {string[]} */
  const codeBlocks = []
  let isCodeBlock = false
  for (let line of lines) {
    if (line.startsWith('```')) {
      isCodeBlock = !isCodeBlock
      if (isCodeBlock) codeBlocks.push('')
    } else if (isCodeBlock) {
      codeBlocks[codeBlocks.length - 1] += line + '\n'
    }
  }
  return codeBlocks
}

/** @type {import('@jest/transform').Transformer} */
const transformer = {
  getCacheKey(
    fileData,
    filename,
    configString,
    { config, instrument, rootDir },
  ) {
    return crypto
      .createHash('md5')
      .update(THIS_FILE)
      .update('\0', 'utf8')
      .update(fileData)
      .update('\0', 'utf8')
      .update(path.relative(rootDir, filename))
      .update('\0', 'utf8')
      .update(configString)
      .update('\0', 'utf8')
      .update(instrument ? 'instrument' : '')
      .update('\0', 'utf8')
      .update(process.env.NODE_ENV || '')
      .digest('hex')
  },

  process(src, filename, config, transformOptions) {
    const lines = src.split('\n')
    const frontMatter = getFrontMatter(lines)
    const codeBlocks = getCodeBlocks(lines)

    const name = frontMatter.name || filename
    const input = codeBlocks[0]
    const output = codeBlocks[1]
    const flag = frontMatter.skip ? '.skip' : ''
    const transformPath = require.resolve('./test-util.ts')
    const code = `
    const transform = require(${JSON.stringify(transformPath)}).default

    test${flag}(${JSON.stringify(name)}, async () => {
      const input = ${JSON.stringify(input)}
      const expected = ${JSON.stringify(output)}
      expect(await transform(input)).toEqual(expected)
    })
    `
    // console.log(code)
    return { code }
  },
}

module.exports = transformer
