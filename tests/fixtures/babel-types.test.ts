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
    "'use strict'

    let _default = {}
    import _builder from '../builder'

    const _super = (_default.Super = Super)

    export { _super as super }
    _default.super = _super

    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          }
    }

    function Super(...args) {
      return (0, _builder)('Super', ...args)
    }

    export default _default
    "
  `)
})
