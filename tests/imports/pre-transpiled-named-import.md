# Transforms named import from babel

```js
'use strict'

var _bar = require('bar')

console.log(_bar.bar)
;(0, _bar.bar)()
```

to

```js
import * as _bar from 'bar'
console.log(_bar.bar)
_bar.bar()
```

# Transforms named import from babel with lazy: true

```js
'use strict'

function _bar() {
  const data = require('bar')

  _bar = function () {
    return data
  }

  return data
}

console.log(_bar().bar)
;(0, _bar().bar)()
```

to

```js
import * as _bar from 'bar'
console.log(_bar.bar)
_bar.bar()
```

# Transforms named import from typescript

```js
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const bar_1 = require('bar')
console.log(bar_1.bar)
bar_1.bar()
```

to

```js
import * as bar_1 from 'bar'
console.log(bar_1.bar)
bar_1.bar()
```
