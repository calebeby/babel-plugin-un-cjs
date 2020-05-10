import transform from '../test-util'

// based on https://unpkg.com/@babel/highlight@7.0.0/lib/index.js

const input = `
exports.shouldHighlight = shouldHighlight
exports.getChalk = getChalk
exports.default = highlight

function _jsTokens() {
  const data = _interopRequireWildcard(require('js-tokens'))
  _jsTokens = function() {
    return data
  }
  return data
}

function _esutils() {
  const data = _interopRequireDefault(require('esutils'))
  _esutils = function() {
    return data
  }
  return data
}

function _chalk() {
  const data = _interopRequireDefault(require('chalk'))
  _chalk = function() {
    return data
  }
  return data
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj
  } else {
    var newObj = {}
    if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc =
            Object.defineProperty && Object.getOwnPropertyDescriptor
              ? Object.getOwnPropertyDescriptor(obj, key)
              : {}
          if (desc.get || desc.set) {
            Object.defineProperty(newObj, key, desc)
          } else {
            newObj[key] = obj[key]
          }
        }
      }
    }
    newObj.default = obj
    return newObj
  }
}

function getDefs(chalk) {
  return {
    keyword: chalk.cyan,
    capitalized: chalk.yellow,
    jsx_tag: chalk.yellow,
    punctuator: chalk.yellow,
    number: chalk.magenta,
    string: chalk.green,
    regex: chalk.magenta,
    comment: chalk.grey,
    invalid: chalk.white.bgRed.bold,
  }
}

function getTokenType(match) {
  const [offset, text] = match.slice(-2)
  _jsTokens().matchToToken(match)

  console.log(_esutils().default.keyword)
}

function highlightTokens(defs, text) {
  return _jsTokens().default
}

function shouldHighlight(options) {
  return _chalk().default.supportsColor || options.forceColor
}

function getChalk(options) {
  let chalk = _chalk().default
  if (options.forceColor) {
    chalk = new (_chalk()).default.constructor({
      enabled: true,
      level: 1,
    })
  }
  return chalk
}

function highlight(code, options = {}) {
  if (shouldHighlight(options)) {
    const chalk = getChalk(options)
    const defs = getDefs(chalk)
    return highlightTokens(defs, code)
  } else {
    return code
  }
}
`

test('babel-highlight', async () => {
  const transformed = await transform(input)
  expect(transformed).toMatchInlineSnapshot(`
    "let _default = {}
    import _chalk from 'chalk'
    import _esutils from 'esutils'
    import * as _jsTokens from 'js-tokens'
    export { shouldHighlight }
    _default.shouldHighlight = shouldHighlight
    export { getChalk }
    _default.getChalk = getChalk
    export { highlight as default }
    _default.default = highlight

    function _interopRequireDefault(obj) {
      return obj && obj.__esModule
        ? obj
        : {
            default: obj,
          }
    }

    function _interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj
      } else {
        var newObj = {}

        if (obj != null) {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              var desc =
                Object.defineProperty && Object.getOwnPropertyDescriptor
                  ? Object.getOwnPropertyDescriptor(obj, key)
                  : {}

              if (desc.get || desc.set) {
                Object.defineProperty(newObj, key, desc)
              } else {
                newObj[key] = obj[key]
              }
            }
          }
        }

        newObj.default = obj
        return newObj
      }
    }

    function getDefs(chalk) {
      return {
        keyword: chalk.cyan,
        capitalized: chalk.yellow,
        jsx_tag: chalk.yellow,
        punctuator: chalk.yellow,
        number: chalk.magenta,
        string: chalk.green,
        regex: chalk.magenta,
        comment: chalk.grey,
        invalid: chalk.white.bgRed.bold,
      }
    }

    function getTokenType(match) {
      const [offset, text] = match.slice(-2)

      _jsTokens.matchToToken(match)

      console.log(_esutils.keyword)
    }

    function highlightTokens(defs, text) {
      return _jsTokens.default
    }

    function shouldHighlight(options) {
      return _chalk.supportsColor || options.forceColor
    }

    function getChalk(options) {
      let chalk = _chalk

      if (options.forceColor) {
        chalk = new _chalk.constructor({
          enabled: true,
          level: 1,
        })
      }

      return chalk
    }

    function highlight(code, options = {}) {
      if (shouldHighlight(options)) {
        const chalk = getChalk(options)
        const defs = getDefs(chalk)
        return highlightTokens(defs, code)
      } else {
        return code
      }
    }
    "
  `)
})
