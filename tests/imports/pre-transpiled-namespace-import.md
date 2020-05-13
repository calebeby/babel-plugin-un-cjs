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
