// @ts-check
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const THIS_FILE = fs.readFileSync(__filename)

/** @param {string[]} lines */
const parseMarkdown = (lines) => {
  const CODE = 'code'
  const HEADING = 'heading'
  const NORMAL = 'normal'
  let currentNodeType = NORMAL

  /** @type {{nodeType: string, lines: string[]}[]} */
  const chunks = []

  for (let line of lines) {
    if (line.trim() === '') continue

    const lastChunk = chunks[chunks.length - 1]

    if (currentNodeType === NORMAL) {
      if (line.startsWith('# ')) {
        chunks.push({ nodeType: HEADING, lines: [line] })
      } else if (line.startsWith('```js')) {
        currentNodeType = CODE
        chunks.push({ nodeType: CODE, lines: [] })
      } else if (lastChunk.nodeType === NORMAL) {
        lastChunk.lines.push(line)
      } else {
        chunks.push({ nodeType: NORMAL, lines: [line] })
      }
    } else if (currentNodeType === CODE) {
      if (line.startsWith('```')) {
        currentNodeType = NORMAL
      } else {
        lastChunk.lines.push(line)
      }
    }
  }

  /** @typedef {{input: string, expected: string}} Assertion */
  /** @typedef {{name: string, assertions: Assertion[]}} Test */

  /** @type {Test[]} */
  const tests = []

  /** @type {Test | undefined} */
  let currentTest

  for (let i = 0; i < chunks.length; i++) {
    const prev = chunks[i - 1]
    const current = chunks[i]
    const next = chunks[i + 1]
    if (current.nodeType === HEADING) {
      if (currentTest) tests.push(currentTest)
      currentTest = {
        name: current.lines[0].replace(/^# /, ''),
        assertions: [],
      }
      continue
    }

    // code, then "to", then code is an assertion
    if (
      currentTest &&
      prev &&
      next &&
      prev.nodeType === CODE &&
      next.nodeType === CODE &&
      current.nodeType === NORMAL &&
      current.lines.length === 1 &&
      current.lines[0] === 'to'
    ) {
      currentTest.assertions.push({
        input: prev.lines.join('\n'),
        expected: next.lines.join('\n') + '\n',
      })
    }
  }
  if (currentTest) tests.push(currentTest)
  return tests
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
    const tests = parseMarkdown(lines)

    const testsText = tests
      .map((t) => {
        const assertionsText = t.assertions
          .map((a) => {
            const input = JSON.stringify(a.input)
            const expected = JSON.stringify(a.expected)
            return `expect(await transform(${input})).toEqual(${expected});`
          })
          .join('\n')
        return `test(${JSON.stringify(t.name)}, async () => {
          ${assertionsText}
        })`
      })
      .join('\n')

    const transformPath = require.resolve('./test-util.ts')
    const code = `
    const transform = require(${JSON.stringify(transformPath)}).default

    ${testsText}
    `

    return { code }
  },
}

module.exports = transformer
