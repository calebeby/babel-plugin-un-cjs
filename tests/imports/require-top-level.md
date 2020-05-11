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

# (skip) Uses default import if require result is used directly

(not implemented yet)

```js
console.log(require('foo-bar'))
```

to

```js
import _1 from 'foo-bar'
console.log(_1)
```
