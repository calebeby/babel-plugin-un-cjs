---
'babel-plugin-un-cjs': minor
---

Handle edge case: instance methods of `Function.prototype`:

If an imported binding _only_ is referenced using properties of `Function.prototype`, this suggests that the imported binding itself is probably a function instead of a namespace, so we create a default import instead of a namespace import.

```js
var bind = require('function-bind')

bind.call(Function.call, Object.prototype.hasOwnProperty)
```

to

```js
import bind from 'function-bind'
bind.call(Function.call, Object.prototype.hasOwnProperty)
```
