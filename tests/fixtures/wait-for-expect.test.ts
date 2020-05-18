import transform from '../../test-util'

test('wait-for-expect', async () => {
  const input = `
'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true,
})
exports.default = void 0

const defaults = {}

var waitForExpect = function waitForExpect(expectation) {}

var _default = Object.assign(waitForExpect, {
  defaults: defaults,
})

exports.default = _default
module.exports = exports.default
module.exports.default = exports.default
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "let _exports = {}
    const defaults = {}

    var waitForExpect = function waitForExpect(expectation) {}

    var _default = Object.assign(waitForExpect, {
      defaults: defaults,
    })

    export default _default
    _exports.default = _default
    "
  `)
})
