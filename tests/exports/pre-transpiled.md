# Transforms babel output with named and default exports

Pre-babel input:

```js
export const foo = () => {}
const asdf = () => {}
export default asdf
```

```js
exports.default = exports.foo = void 0

const foo = () => {}

exports.foo = foo

const asdf = () => {}

var _default = asdf
exports.default = _default
```

to

```js
let _default2 = {}

const foo = () => {}

export { foo }
_default2.foo = foo

const asdf = () => {}

var _default = asdf
export default _default
_default2.default = _default
```

# Transforms babel output with multiple aliased exports

```js
'use strict'

exports.asdf = exports.foo = void 0

const foo = () => {}

exports.asdf = exports.foo = foo
```

to

```js
let _default = {}

const foo = () => {}

export { foo as asdf }
export { foo }
_default.asdf = _default.foo = foo
export default _default
```
