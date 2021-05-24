import transform from '../test-util'

describe('handle export object', () => {
  test('handles Object.defineProperty on exports', async () => {
    const input = `
var _package = require("../package.json");
Object.defineProperty(exports, "version", {
  enumerable: true,
  get: function () {
    return _package.version;
  }
});
  `
    const transformed = await transform(input)
    expect(transformed).toMatchInlineSnapshot(`
      "import * as _package from '../package.json'
      export { version } from '../package.json'
      "
    `)
  })
  describe('handles objects', () => {
    test('export property on object', async () => {
      const input = `
const foo = 'foo'
module.exports.foobar = 'foobar'
module.exports = {
  foo: () => {},
}
module.exports.foobarbaz = 'foobarbaz'
`
      const transformed = await transform(input)
      expect(transformed).toMatchInlineSnapshot(`
        "const foo = 'foo'
        _exports.foobar = 'foobar'

        const _foo = () => {}

        export { _foo as foo }
        let _exports = {
          foo: _foo,
        }
        export const foobarbaz = 'foobarbaz'
        _exports.foobarbaz = foobarbaz
        export default _exports
        "
      `)
    })
    test('export property on referenced object', async () => {
      const input = `
const obj = {
  foo: () => {},
}
module.exports = obj
obj.foobarbaz = 'foobarbaz'
module.exports.otherExport = 'otherExport'
`
      const transformed = await transform(input)
      expect(transformed).toMatchInlineSnapshot(`
        "export const foo = () => {}
        const obj = {
          foo: foo,
        }
        let _exports = obj
        export const foobarbaz = 'foobarbaz'
        obj.foobarbaz = foobarbaz
        export const otherExport = 'otherExport'
        _exports.otherExport = otherExport
        export default _exports
        "
      `)
    })
  })
  describe('handles non-objects', () => {
    test.skip('export property on inlined non-object', async () => {
      const input = `
exports.foo = 'foo'
module.exports = () => {}
module.exports.asdf = 'asdf'
`
      const transformed = await transform(input)
      // TODO: Fix bug because _default.foo is assigned before _default exists
      expect(transformed).toMatchInlineSnapshot(`
        "_default.foo = 'foo';

        let _default = () => {};

        export const asdf = 'asdf';
        _default.asdf = asdf;
        export default _default;"
      `)
    })
    test('export property on referenced non-object', async () => {
      const input = `
let main = () => {}
main.other = 'hiiiii'
module.exports = main
`
      const transformed = await transform(input)
      expect(transformed).toMatchInlineSnapshot(`
        "let main = () => {}

        export const other = 'hiiiii'
        main.other = other
        export default main
        let _exports = main
        "
      `)
    })
  })
})

test('export * from', async () => {
  // babel output of export * from
  const input = `
var _waitFor = require("./wait-for");

Object.keys(_waitFor).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _waitFor[key];
    }
  });
});
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "export * from './wait-for'
    "
  `)
})

test('export * from, without _exportNames', async () => {
  // babel output of export * from
  const input = `
var _waitFor = require("./wait-for");

Object.keys(_waitFor).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _waitFor[key];
    }
  });
});
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "export * from './wait-for'
    "
  `)
})

test.skip('export * from, when also exported as named', async () => {
  // babel output of export * from
  const input = `
var queryHelpers = _interopRequireWildcard(require("./query-helpers"));

exports.queryHelpers = queryHelpers;
Object.keys(queryHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return queryHelpers[key];
    }
  });
});

`
  const transformed = await transform(input)
  console.log(transformed)
  // expect(transformed).toMatchInlineSnapshot()
})

test('destructured require', async () => {
  const input = `
const { docsUrl, foo: bar, default: utils } = require('../utilities');
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "import { docsUrl, foo as bar, default as utils } from '../utilities'
    "
  `)
})

describe('uses single declaration for _default if possible', () => {
  test('module.exports', async () => {
    const input = `
  module.exports.bar = 'hi'
module.exports = {
  foo: () => {}
}
`
    const transformed = await transform(input)
    expect(transformed).toMatchInlineSnapshot(`
      "_exports.bar = 'hi'
      export const foo = () => {}
      let _exports = {
        foo: foo,
      }
      export default _exports
      "
    `)
  })

  test('exports', async () => {
    const input = `
  exports.bar = 'hi'
exports = {
  foo: () => {}
}
`
    const transformed = await transform(input)
    // It is not a bug that bar is exported here but not in the above module.exports code.
    // And in the above module.exports code foo is exported but not here
    // It is because assigning to the `exports` object does not clear out the `module.exports` object
    expect(transformed).toMatchInlineSnapshot(`
      "let _exports = {}
      export const bar = 'hi'
      _exports.bar = bar
      _exports = {
        foo: () => {},
      }
      export default _exports
      "
    `)
  })
})
