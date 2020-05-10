# (skip) Converts top-level require into namespace imports

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

# (skip) Uses default import if top-level name is used

```js
const myModule = require('my-module')

myModule()
myModule.foo()
myModule.bar()
```

to

```js
import _myModule from 'my-module'

_myModule()

_myModule.foo()

_myModule.bar()
```
