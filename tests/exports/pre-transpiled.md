# Transforms babel output with named and default exports

Pre-babel input:

```js
export const foo = () => {}
const asdf = () => {}
export default asdf
```

```js
exports.default = exports.foo = void 0

const foo = () => {}

exports.foo = foo

const asdf = () => {}

var _default = asdf
exports.default = _default
```

to

```js
let _exports = {}

const foo = () => {}

export { foo }
_exports.foo = foo

const asdf = () => {}

var _default = asdf
export default _default
_exports.default = _default
```

# Transforms TS output with named and default exports

Pre-TS input:

```js
export const foo = () => {}
const asdf = () => {}
export default asdf
```

```js
Object.defineProperty(exports, '__esModule', { value: true })
exports.foo = void 0
exports.foo = () => {}
const asdf = () => {}
exports.default = asdf
```

to

```js
let _exports = {}
export const foo = () => {}
_exports.foo = foo

const asdf = () => {}

export default asdf
_exports.default = asdf
```

# Transforms babel output with multiple aliased exports

Pre-babel input:

```js
export const foo = () => {}
export { foo as asdf }
```

```js
exports.asdf = exports.foo = void 0

const foo = () => {}

exports.asdf = exports.foo = foo
```

to

```js
let _exports = {}

const foo = () => {}

export { foo as asdf }
export { foo }
_exports.asdf = _exports.foo = foo
export default _exports
```

# Transforms TS output with multiple aliased exports

Ideally, the `asdf` export wouldn't reference \_exports after transformation

Pre-TS input:

```js
export const foo = () => {}
export { foo as asdf }
```

```js
Object.defineProperty(exports, '__esModule', { value: true })
exports.asdf = exports.foo = void 0
exports.foo = () => {}
exports.asdf = exports.foo
```

to

```js
let _exports = {}
export const foo = () => {}
_exports.foo = foo
export const asdf = _exports.foo
_exports.asdf = asdf
export default _exports
```

# Transforms babel's export \* from ""

Pre-babel input:

```js
export * from 'foo'
```

```js
'use strict'

var _foo = require('foo')

Object.keys(_foo).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _foo[key]
    },
  })
})
```

to

```js
export * from 'foo'
```

# Transforms babel's `export * from ""` with exportNames

When there are exports in addition to the namespace export, babel uses an `_exportNames` variable so that locally-exported variables have export precedence over namespace-exported variables

Pre-babel input:

```js
export * from 'foo'
export const asdf = ''
```

```js
var _exportNames = {
  asdf: true,
}
exports.asdf = void 0

var _foo = require('foo')

Object.keys(_foo).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return
  if (key in exports && exports[key] === _foo[key]) return
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _foo[key]
    },
  })
})
const asdf = ''
exports.asdf = asdf
```

to

```js
let _exports = {}
export * from 'foo'
var _exportNames = {
  asdf: true,
}
const asdf = ''
export { asdf }
_exports.asdf = asdf
export default _exports
```

# Transforms babel's export \* from "" with loose: true

Pre-babel input:

```js
export * from 'foo'
```

```js
'use strict'

var _foo = require('foo')

Object.keys(_foo).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return
  exports[key] = _foo[key]
})
```

to

```js
export * from 'foo'
```

# Transforms Typescript's export \* from ""

Pre-TS input:

```js
export * from 'foo'
```

```js
'use strict'
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k]
          },
        })
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !exports.hasOwnProperty(p))
        __createBinding(exports, m, p)
  }
Object.defineProperty(exports, '__esModule', { value: true })
__exportStar(require('foo'), exports)
```

to

```js
export * from 'foo'
```

# Transforms TS/babel's export {foo} from ""

Pre-TS/babel input:

```js
export { foo as default, bar } from 'asdf'
```

Babel and TS handle this the exact same way

```js
'use strict'

Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return _asdf.foo
  },
})
Object.defineProperty(exports, 'bar', {
  enumerable: true,
  get: function () {
    return _asdf.bar
  },
})

var _asdf = require('asdf')
```

to

```js
import * as _asdf from 'asdf'
export { foo as default } from 'asdf'
export { bar } from 'asdf'
```

# Transforms babel's export {foo} from "" with loose: true

Pre-babel input:

```js
export { foo as default, bar } from 'asdf'
```

```js
'use strict'

exports.bar = exports.default = void 0

var _asdf = require('asdf')

exports.default = _asdf.foo
exports.bar = _asdf.bar
```

to

```js
import * as _asdf from 'asdf'
export { foo as default } from 'asdf'
export { bar } from 'asdf'
```

# (skip) Transforms babel's export {foo} from "" with loose: true and implicit default export

This is missing the implicitly-created default export

Pre-babel input:

```js
export { bar } from 'asdf'
```

```js
'use strict'

exports.__esModule = true
exports.bar = void 0

var _asdf = require('asdf')

exports.bar = _asdf.bar
```

to

```js
import * as _asdf from 'asdf'
export { bar } from 'asdf'
```
