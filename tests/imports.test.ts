import transform from '../test-util'

test('simplifies babel lazy import block', async () => {
  const input = `
function _parser() {
  const data = require("@babel/parser");

  _parser = function () {
    return data;
  };

  return data;
}

console.log(_parser().tokTypes)
`

  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import * as _parser from '@babel/parser'
    console.log(_parser.tokTypes)
    "
  `)
})

describe('handle named imports', () => {
  test('actually default import', async () => {
    const input = `
const foo = require('bar')
foo.bar()
foo()
`
    const transformed = await transform(input)
    expect(transformed).toMatchInlineSnapshot(`
      "import foo from 'bar'
      foo.bar()
      foo()
      "
    `)
  })

  test('named imports', async () => {
    const input = `
const foo = require('bar')
foo.bar()
foo.baz()
`
    const transformed = await transform(input)
    expect(transformed).toMatchInlineSnapshot(`
      "import * as foo from 'bar'
      foo.bar()
      foo.baz()
      "
    `)
  })
})

test('interopRequireDefault (from babel)', async () => {
  const input = `
var _hi = _interopRequireDefault(require("hi"));
(0, _hi.default)()
console.log(_hi.default);
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import _hi from 'hi'
    ;(0, _hi)()
    console.log(_hi)
    "
  `)
})

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
      ;(0, _hi2)()
      console.log(_hi2)
    }
    "
  `)
})

test('interopRequireDefault in sub scope with no conflicting name', async () => {
  const input = `
const foo = () => {
  var _hi = _interopRequireDefault(require("hi"));
  (0, _hi.default)()
  console.log(_hi.default);
}
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import _hi from 'hi'

    const foo = () => {
      ;(0, _hi)()
      console.log(_hi)
    }
    "
  `)
})

test('interopRequireWildcard (from babel)', async () => {
  const input = `
var foo = _interopRequireWildcard(require("asdf"));
foo()
foo.asdf()
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import * as foo from 'asdf'
    foo()
    foo.asdf()
    "
  `)
})

test('interopRequireWildcard in sub scope with no conflicting name', async () => {
  const input = `
const asdf = () => {
  const foo = _interopRequireWildcard(require("asdf"));
  foo()
  foo.asdf()
}
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import * as foo from 'asdf'

    const asdf = () => {
      foo()
      foo.asdf()
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
    "import * as foo from 'asdf'
    const foo = 'hi'

    const asdf = () => {
      foo()
      foo.asdf()
    }
    "
  `)
})

test('__importDefault (from TS)', async () => {
  const input = `
const asdf_1 = __importDefault(require("asdf"));
asdf_1.default();
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import asdf_1 from 'asdf'
    asdf_1()
    "
  `)
})

test('__importStar (from TS)', async () => {
  const input = `
const foo = __importStar(require("asdf"));
foo();
foo.asdf();
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import * as foo from 'asdf'
    foo()
    foo.asdf()
    "
  `)
})
