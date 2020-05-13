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

# Transforms default import from babel with noInterop: true

```js
'use strict'

var _bar = require('bar')

console.log(_bar.default)
;(0, _bar.default)()
```

to

```js
import _bar from 'bar'
console.log(_bar)

_bar()
```

# Transforms default import from babel with lazy: true

```js
'use strict'

function _bar() {
  const data = _interopRequireDefault(require('bar'))

  _bar = function () {
    return data
  }

  return data
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}

console.log(_bar().default)
;(0, _bar().default)()
```

to

```js
import _bar from 'bar'
console.log(_bar)

_bar()
```

# Transforms default import from babel with lazy: true and noInterop: true

```js
'use strict'

function _bar() {
  const data = require('bar')

  _bar = function () {
    return data
  }

  return data
}

console.log(_bar().default)
;(0, _bar().default)()
```

to

```js
import _bar from 'bar'
console.log(_bar)

_bar()
```

# Transforms default import from typescript with esModuleInterop: true

```js
'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const bar_1 = __importDefault(require('bar'))
console.log(bar_1.default)
bar_1.default()
```

to

```js
import bar_1 from 'bar'
console.log(bar_1)
bar_1()
```

# Transforms default import from typescript with esModuleInterop: false

```js
'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const bar_1 = __importDefault(require('bar'))
console.log(bar_1.default)
bar_1.default()
```

to

```js
import bar_1 from 'bar'
console.log(bar_1)
bar_1()
```
