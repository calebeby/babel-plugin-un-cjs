# Transforms default import from babel with default options

```js
'use strict'

var _bar = _interopRequireDefault(require('bar'))

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}

console.log(_bar.default)
;(0, _bar.default)()
```

to

```js
import _bar from 'bar'
console.log(_bar)

_bar()
```

# (skip) Transforms default import from babel with noInterop: true

```js
'use strict'

var _bar = require('bar')

// import foo, { asdf } from 'bar'
console.log(_bar.default)
;(0, _bar.default)()
```

to

```js
import _bar from 'bar'
console.log(_bar)

_bar()
```
