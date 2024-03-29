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

# Special case: instance methods of `Function.prototype`

`Function.prototype.call` suggests that the `bind` variable is itself a function, not a namespace with a `call` member. Same for other methods of Function.prototype:

```js
var bind = require('function-bind')

bind.call(Function.call, Object.prototype.hasOwnProperty)
bind.apply(null)
bind.bind(window)
bind.toString()
```

to

```js
import bind from 'function-bind'
bind.call(Function.call, Object.prototype.hasOwnProperty)
bind.apply(null)
bind.bind(window)
bind.toString()
```

As soon as we call a function that is _not_ a method of `Function.prototype`, we should interpret the `bind` variable as a namespace with those members instead.

```js
var bind = require('function-bind')

bind.call(Function.call, Object.prototype.hasOwnProperty)
bind.apply(null)
bind.bind(window)
bind.toString()
bind.somethingElse()
```

to

```js
import * as bind from 'function-bind'
bind.call(Function.call, Object.prototype.hasOwnProperty)
bind.apply(null)
bind.bind(window)
bind.toString()
bind.somethingElse()
```

# Creates namespace import even when require is in sub scope:

```js
const myModule = 'dont override me'

if (myModule) {
  const myModule = require('my-module')
  myModule.foo()

  myModule.bar()
}
```

to

```js
import * as _myModule from 'my-module'
const myModule = 'dont override me'
if (myModule) {
  _myModule.foo()
  _myModule.bar()
}
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

And it doesn't conflict the name, even in a sub scope:

```js
const s = 'dont override me'
const file = 'dont override me'
const main = () => {
  const s = require('file')
  s()
}
```

to

```js
import _s from 'file'
const s = 'dont override me'
const file = 'dont override me'
const main = () => {
  _s()
}
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

# Uses default import if require result is never used

```js
const hello = require('foo')
```

to

```js
import hello from 'foo'
```

And it doesn't conflict the name:

```js
const s = () => {
  const hello = require('foo')
}
```

to

```js
import hello from 'foo'
const s = () => {}
```

# Require with destructuring and rest/spread

```js
const { foo, ...rest } = require('module')
```

to

```js
import module from 'module'
const { foo, ...rest } = module
```

# Require with stringed property

```js
const { foo, 'Foo-Bar': a } = require('module')
```

to

```js
import module from 'module'
const { foo, 'Foo-Bar': a } = module
```

# Require with dynamic property

```js
const { foo, [asdf()]: a } = require('module')
```

to

```js
import module from 'module'
const { foo, [asdf()]: a } = module
```

# Require with array destructuring

```js
const [a, b, c] = require('module')
```

to

```js
import module from 'module'
const [a, b, c] = module
```
