import transform from '../../test-util'

// based on https://unpkg.com/@babel/core@7.6.4/lib/index.js

const input = `
var _package = require("../package.json");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Plugin = Plugin;
Object.defineProperty(exports, "version", {
  enumerable: true,
  get: function () {
    return _package.version;
  }
});
Object.defineProperty(exports, "template", {
  enumerable: true,
  get: function () {
    return _template().default;
  }
});

function _template() {
  const data = _interopRequireDefault(require("@babel/template"));

  _template = function () {
    return data;
  };

  return data;
}

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_EXTENSIONS = Object.freeze([".js", ".jsx", ".es6", ".es", ".mjs"]);
exports.DEFAULT_EXTENSIONS = DEFAULT_EXTENSIONS;

class OptionManager {
  init(opts) {
    return (0, _config.loadOptions)(opts);
  }

}

exports.OptionManager = OptionManager;

function Plugin(alias) {
  throw new Error(\`The (\${alias}) Babel 5 plugin is being run with an unsupported Babel version.\`);
}
`

test('babel', async () => {
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "let _default = {}
    import * as _package from '../package.json'
    import _template from '@babel/template'
    export { Plugin }
    _default.Plugin = Plugin
    export const version = _package.version
    _default.version = _package.version
    export { _template as template }
    _default.template = _template

    function _getRequireWildcardCache() {
      if (typeof WeakMap !== 'function') return null
      var cache = new WeakMap()

      _getRequireWildcardCache = function () {
        return cache
      }

      return cache
    }

    function _interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj
      }

      var cache = _getRequireWildcardCache()

      if (cache && cache.has(obj)) {
        return cache.get(obj)
      }

      var newObj = {}

      if (obj != null) {
        var hasPropertyDescriptor =
          Object.defineProperty && Object.getOwnPropertyDescriptor

        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor
              ? Object.getOwnPropertyDescriptor(obj, key)
              : null

            if (desc && (desc.get || desc.set)) {
              Object.defineProperty(newObj, key, desc)
            } else {
              newObj[key] = obj[key]
            }
          }
        }
      }

      newObj.default = obj

      if (cache) {
        cache.set(obj, newObj)
      }

      return newObj
    }

    const DEFAULT_EXTENSIONS = Object.freeze(['.js', '.jsx', '.es6', '.es', '.mjs'])
    export { DEFAULT_EXTENSIONS }
    _default.DEFAULT_EXTENSIONS = DEFAULT_EXTENSIONS

    class OptionManager {
      init(opts) {
        return _config.loadOptions(opts)
      }
    }

    export { OptionManager }
    _default.OptionManager = OptionManager

    function Plugin(alias) {
      throw new Error(
        \`The (\${alias}) Babel 5 plugin is being run with an unsupported Babel version.\`,
      )
    }

    export default _default
    "
  `)
})
