# Example

```js
const { foo } = require('bar')
module.exports.asdf = foo
```

to

```js
let _default = {}
import { foo } from 'bar'
export { foo as asdf }
_default.asdf = foo
export default _default
```
