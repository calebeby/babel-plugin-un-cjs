import transform from '../../test-util'

// based on https://unpkg.com/browse/@babel/types@7.6.3/lib/builders/generated/index.js

const input = `
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.super = exports.Super = Super;

var _builder = _interopRequireDefault(require("../builder"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Super(...args) {
  return (0, _builder.default)("Super", ...args);
}
`

test('babel-types', async () => {
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "let _exports = {}
    import _builder from '../builder'
    export { Super as super }
    export { Super }
    _exports.super = _exports.Super = Super

    function Super(...args) {
      return _builder('Super', ...args)
    }

    export default _exports
    "
  `)
})
