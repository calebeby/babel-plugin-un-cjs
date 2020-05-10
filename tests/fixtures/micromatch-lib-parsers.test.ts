import transform from '../../test-util'

// based on https://unpkg.com/micromatch@3.1.0/lib/parsers.js

test('micromatch lib parsers', async () => {
  const input = `
var extglob = require('extglob');
var nanomatch = require('nanomatch');
var regexNot = require('regex-not');
var toRegex = require('to-regex');

module.exports = function(snapdragon) {
  console.log('nanomatch', nanomatch.parsers);
  console.log('extglob', extglob.parsers);
};

module.exports.sdf = function () {
  regexNot.create();
  return toRegex();
}

exports.asdf = nanomatch
`
  expect(await transform(input)).toMatchInlineSnapshot(`
    "import _toRegex from 'to-regex'
    import { create } from 'regex-not'
    import _nanomatch from 'nanomatch'
    import { parsers } from 'extglob'

    let _default = function (snapdragon) {
      console.log('nanomatch', _nanomatch.parsers)
      console.log('extglob', parsers)
    }

    export const sdf = function () {
      create()
      return _toRegex()
    }
    _default.sdf = sdf
    export { _nanomatch as asdf }
    _default.asdf = _nanomatch
    export default _default
    "
  `)
})
