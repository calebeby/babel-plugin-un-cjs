import transform from '../test-util'

test('interopRequireDefault in sub scope with conflicting name', async () => {
  const input = `
const _hi = 'hi'
const foo = () => {
  var _hi = _interopRequireDefault(require("hi"));
  (0, _hi.default)()
  console.log(_hi.default);
}
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import _hi2 from 'hi'
    const _hi = 'hi'

    const foo = () => {
      _hi2()

      console.log(_hi2)
    }
    "
  `)
})

test('interopRequireWildcard in sub scope with conflicting name', async () => {
  const input = `
const foo = 'hi'
const asdf = () => {
  const foo = _interopRequireWildcard(require("asdf"));
  foo()
  foo.asdf()
}
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import * as _foo from 'asdf'
    const foo = 'hi'

    const asdf = () => {
      _foo()

      _foo.asdf()
    }
    "
  `)
})
