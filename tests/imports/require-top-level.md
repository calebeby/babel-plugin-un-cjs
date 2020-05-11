# Converts top-level require into namespace imports

```js
const myModule = require('my-module')

myModule.foo()
myModule.bar()
```

to

```js
import * as myModule from 'my-module'
myModule.foo()
myModule.bar()
```

# Uses default import if top-level name is used

```js
const myModule = require('my-module')

myModule()
myModule.foo()
myModule.bar()
```

to

```js
import myModule from 'my-module'
myModule()
myModule.foo()
myModule.bar()
```

# Uses default import if require result is used directly

```js
console.log(require('foo-bar'))
```

to

```js
import foobar from 'foo-bar'
console.log(foobar)
```

And it doesn't conflict the name:

```js
const foobar = 'dont override me'
console.log(require('foo-bar'))
```

to

```js
import _foobar from 'foo-bar'
const foobar = 'dont override me'
console.log(_foobar)
```

Even in a sub scope:

```js
const foobar = () => {
  const _foobar = 'hi'
  console.log(require('foo-bar'))
}
```

to

```js
import _foobar2 from 'foo-bar'

const foobar = () => {
  const _foobar = 'hi'
  console.log(_foobar2)
}
```
