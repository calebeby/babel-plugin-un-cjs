// based on https://unpkg.com/snapdragon@0.8.2/lib/utils.js
import transform from '../../test-util'

const input = `
exports.extend = require('extend-shallow');
exports.SourceMap = require('source-map');
exports.sourceMapResolve = require('source-map-resolve');

exports.unixify = function(fp) {
  return 'unixify'
};

exports.isString = function(str) {
  return str && typeof str === 'string';
};

exports.arrayify = function(val) {
  if (typeof val === 'string') return [val];
  return val ? (Array.isArray(val) ? val : [val]) : [];
};

exports.last = function(arr, n) {
  return arr[arr.length - (n || 1)];
};
`

test('snapdragon-utils', async () => {
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "let _default = {}
    import extendshallow from 'extend-shallow'
    import sourcemap from 'source-map'
    import sourcemapresolve from 'source-map-resolve'
    export { extendshallow as extend }
    _default.extend = extendshallow
    export { sourcemap as SourceMap }
    _default.SourceMap = sourcemap
    export { sourcemapresolve as sourceMapResolve }
    _default.sourceMapResolve = sourcemapresolve
    export const unixify = function (fp) {
      return 'unixify'
    }
    _default.unixify = unixify
    export const isString = function (str) {
      return str && typeof str === 'string'
    }
    _default.isString = isString
    export const arrayify = function (val) {
      if (typeof val === 'string') return [val]
      return val ? (Array.isArray(val) ? val : [val]) : []
    }
    _default.arrayify = arrayify
    export const last = function (arr, n) {
      return arr[arr.length - (n || 1)]
    }
    _default.last = last
    export default _default
    "
  `)
})
