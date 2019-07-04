import transform from '../test-util'

// based on https://unpkg.com/regex-not@1.0.2/index.js

test('regex-not', async () => {
  const input = `
'use strict';

var extend = require('extend-shallow');
var safe = require('safe-regex');

function toRegex(pattern, options) {
  return new RegExp(toRegex.create(pattern, options));
}

toRegex.create = function(pattern, options) {
  extend(foo, bar)
  safe(blah)
  return 'blah'
};

module.exports = toRegex;
`
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "'use strict';

    let _default = {};
    import _safe from \\"safe-regex\\";
    import _extend from \\"extend-shallow\\";

    function toRegex(pattern, options) {
      return new RegExp(toRegex.create(pattern, options));
    }

    export const create = function (pattern, options) {
      _extend(foo, bar);

      _safe(blah);

      return 'blah';
    };
    toRegex.create = create;
    _default = toRegex;
    export default _default;"
  `)
})
