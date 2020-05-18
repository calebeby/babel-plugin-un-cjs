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
    "import * as extglob from 'extglob'
    import nanomatch from 'nanomatch'
    import * as regexNot from 'regex-not'
    import toRegex from 'to-regex'

    let _exports = function (snapdragon) {
      console.log('nanomatch', nanomatch.parsers)
      console.log('extglob', extglob.parsers)
    }

    export const sdf = function () {
      regexNot.create()
      return toRegex()
    }
    _exports.sdf = sdf
    export { nanomatch as asdf }
    _exports.asdf = nanomatch
    export default _exports
    "
  `)
})
