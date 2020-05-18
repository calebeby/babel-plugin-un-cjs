// @ts-check
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { SourceMapGenerator } = require('source-map')

const THIS_FILE = fs.readFileSync(__filename)

/** @param {string[]} lines */
const parseMarkdown = (lines) => {
  const CODE = 'code'
  const HEADING = 'heading'
  const NORMAL = 'normal'
  let currentNodeType = NORMAL

  /** @typedef {{line: number, contents}} Line */

  /** @type {{nodeType: string, lines: Line[]}[]} */
  const chunks = []

  for (let i = 0; i < lines.length; i++) {
    /** @type {Line} */
    const line = { line: i + 1, contents: lines[i] }

    const lastChunk = chunks[chunks.length - 1]

    if (currentNodeType === NORMAL) {
      if (line.contents.trim() === '') continue
      if (line.contents.startsWith('# ')) {
        chunks.push({ nodeType: HEADING, lines: [line] })
      } else if (line.contents.startsWith('```js')) {
        currentNodeType = CODE
        chunks.push({ nodeType: CODE, lines: [] })
      } else if (lastChunk.nodeType === NORMAL) {
        lastChunk.lines.push(line)
      } else {
        chunks.push({ nodeType: NORMAL, lines: [line] })
      }
    } else if (currentNodeType === CODE) {
      if (line.contents.startsWith('```')) {
        currentNodeType = NORMAL
      } else {
        lastChunk.lines.push(line)
      }
    }
  }

  /** @typedef {{input: Line[], expected: Line[], line: number}} Assertion */
  /** @typedef {{name: string, assertions: Assertion[], flag?: string}} Test */

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
      const testName = current.lines[0].contents.replace(/^# /, '')
      const SKIP = '(skip)'
      const ONLY = '(only)'
      const flag = testName.includes(SKIP)
        ? 'skip'
        : testName.includes(ONLY)
        ? 'only'
        : undefined
      currentTest = {
        name: testName.replace(SKIP, '').replace(ONLY, '').trim(),
        assertions: [],
        flag,
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
      current.lines[0].contents === 'to'
    ) {
      currentTest.assertions.push({
        input: prev.lines,
        expected: next.lines,
        line: current.lines[0].line,
      })
    }
  }
  if (currentTest) tests.push(currentTest)
  return tests
}

/** @type {import('@jest/transform').Transformer} */
const transformer = {
  process(src, filename, config) {
    const lines = src.split('\n')
    const tests = parseMarkdown(lines)

    const map = new SourceMapGenerator()

    const transformPath = JSON.stringify(require.resolve('./test-util.ts'))
    let code = `const transform = require(${transformPath}).default`

    for (let test of tests) {
      const flag = test.flag ? `.${test.flag}` : ''
      code += `\ntest${flag}(${JSON.stringify(test.name)}, async () => {\n`
      for (let assertion of test.assertions) {
        const input = JSON.stringify(
          assertion.input.map((l) => l.contents).join('\n'),
        )
        const expected = JSON.stringify(
          assertion.expected.map((l) => l.contents).join('\n') + '\n',
        )
        code += `\nexpect(await transform(${input})).toEqual(${expected})`
        map.addMapping({
          generated: {
            line: code.split('\n').length,
            column: 0,
          },
          source: path.resolve(config.rootDir, filename),
          original: {
            line: assertion.line,
            column: 0,
          },
        })
      }
      code += '\n})'
    }

    return { code, map: map.toJSON() }
  },
}

module.exports = transformer
