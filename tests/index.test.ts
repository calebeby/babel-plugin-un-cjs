import transform from './test-util'

test.todo('destructured require')

test('replaces global with window', async () => {
  const input = `
console.log(global.asdf)
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`"console.log(window.asdf);"`)
})

test('removes __esModule', async () => {
  const input = `
 Object.defineProperty(exports, '__esModule', {
  value: true
}); 
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`""`)
})

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
      "let _default = {};
      import { version } from \\"../package.json\\";
      export { version };
      _default.version = version;
      export default _default;"
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
        "let _default = {};
        const foo = 'foo';
        _default.foobar = 'foobar';

        const _foo = () => {};

        export { _foo as foo };
        _default = {
          foo: _foo
        };
        export const foobarbaz = 'foobarbaz';
        _default.foobarbaz = foobarbaz;
        export default _default;"
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
        "let _default = {};
        export const foo = () => {};
        const obj = {
          foo: foo
        };
        _default = obj;
        export const foobarbaz = 'foobarbaz';
        obj.foobarbaz = foobarbaz;
        export const otherExport = 'otherExport';
        _default.otherExport = otherExport;
        export default _default;"
      `)
    })
  })
  describe('handles non-objects', () => {
    test('export property on inlined non-object', async () => {
      const input = `
exports.foo = 'foo'
module.exports = () => {}
module.exports.asdf = 'asdf'
`
      const transformed = await transform(input)
      expect(transformed).toMatchInlineSnapshot(`
        "let _default = {};
        _default.foo = 'foo';

        _default = () => {};

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
        "let _default = {};

        let main = () => {};

        export const other = 'hiiiii';
        main.other = other;
        _default = main;
        export default _default;"
      `)
    })
  })
})
