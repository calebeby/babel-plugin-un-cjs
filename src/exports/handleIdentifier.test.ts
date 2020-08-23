import { parse, traverse } from '@babel/core'
import { isGlobalVariableName } from './handleIdentifier'

const getGlobalIdentifiers = (input: string): string[] => {
  const parsed = parse(input, { parserOpts: { plugins: ['jsx'] } })
  if (!parsed) return []
  const identifiers: string[] = []
  traverse(parsed, {
    Identifier(path) {
      if (isGlobalVariableName(path)) {
        identifiers.push(path.node.name)
      }
    },
    JSXIdentifier(path) {
      if (isGlobalVariableName(path)) {
        identifiers.push(path.node.name)
      }
    },
  })
  return identifiers
}

test('getGlobalIdentifiers works correctly', () => {
  expect(getGlobalIdentifiers(`module.exports = 'hi'`)).toEqual(['module'])
  expect(
    getGlobalIdentifiers(`
      const foo = () => {
        module.exports = 'hi'
      }
    `),
  ).toEqual(['module'])
  expect(
    getGlobalIdentifiers(`
      module = 'hi'
      module.exports = 'hi'
    `),
  ).toEqual(['module', 'module'])
  expect(
    getGlobalIdentifiers(`
      function foo() {
        return module
      }
    `),
  ).toEqual(['module'])
  expect(
    getGlobalIdentifiers(`
      function module() {
        return module
      }
    `),
  ).toEqual([])
  expect(
    getGlobalIdentifiers(`
      exports = {}
    `),
  ).toEqual(['exports'])
  expect(
    getGlobalIdentifiers(`
      exports
    `),
  ).toEqual(['exports'])
  expect(
    getGlobalIdentifiers(`
      let exports = {}
      exports
    `),
  ).toEqual([])
  expect(
    getGlobalIdentifiers(`
      let exports
      exports = {}
    `),
  ).toEqual([])
  expect(
    getGlobalIdentifiers(`
      <asdf.foo />
    `),
  ).toEqual(['asdf'])
  expect(
    getGlobalIdentifiers(`
      function asdf () {
        return <asdf.asdf />
      }
    `),
  ).toEqual([])
})
