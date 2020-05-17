# Transforms namespace import from babel with default options

```js
'use strict'

var React = _interopRequireWildcard(require('react'))

function _getRequireWildcardCache() {
  // ...
}

function _interopRequireWildcard(obj) {
  // ...
}

console.log(React.h, React.default)
```

to

```js
import * as React from 'react'
console.log(React.h, React.default)
```

# Transforms namespace import from babel with noInterop: true

```js
'use strict'

var React = require('react')

console.log(React.h, React.default)
```

to

```js
import * as React from 'react'
console.log(React.h, React.default)
```

# Transforms namespace import from babel with lazy: true

```js
'use strict'

function React() {
  const data = _interopRequireWildcard(require('react'))

  React = function () {
    return data
  }

  return data
}

function _getRequireWildcardCache() {
  // ...
}

function _interopRequireWildcard(obj) {
  // ...
}

console.log(React().h, React().default)
```

to

```js
import * as React from 'react'
console.log(React.h, React.default)
```

# Transforms namespace import from babel with lazy: true and noInterop: true

```js
'use strict'

function React() {
  const data = require('react')

  React = function () {
    return data
  }

  return data
}

console.log(React().h, React().default)
```

to

```js
import * as React from 'react'
console.log(React.h, React.default)
```

# Transforms namespace import from typescript with esModuleInterop: true

```js
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
// TODO: add actual helpers here to make sure they get removed
const React = __importStar(require('react'))
console.log(React.h, React.default)
```

to

```js
import * as React from 'react'
console.log(React.h, React.default)
```

# Transforms namespace import from typescript with esModuleInterop: false

```js
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const React = require('react')
console.log(React.h, React.default)
```

to

```js
import * as React from 'react'
console.log(React.h, React.default)
```

# Transforms namespace import from typescript sub scope (generated from dynamic import)

```js
const hi = 'hi'
Promise.resolve().then(() => __importStar(require('hi')))
```

to

```js
import * as _hi from 'hi'
const hi = 'hi'
Promise.resolve().then(() => _hi)
```

# Transforms namespace import from typescript sub scope and deconflicts variable

```js
const foo = 'dont override me'

const main = () => {
  const foo = __importStar(require('hi'))
  foo.bar()
}
```

to

```js
import * as _foo from 'hi'
const foo = 'dont override me'

const main = () => {
  _foo.bar()
}
```
