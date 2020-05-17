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

# Transforms TS output with named and default exports

Pre-TS input:

```js
export const foo = () => {}
const asdf = () => {}
export default asdf
```

```js
Object.defineProperty(exports, '__esModule', { value: true })
exports.foo = void 0
exports.foo = () => {}
const asdf = () => {}
exports.default = asdf
```

to

```js
let _default = {}
export const foo = () => {}
_default.foo = foo

const asdf = () => {}

export default asdf
_default.default = asdf
```

# Transforms babel output with multiple aliased exports

```js
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

# Transforms TS output with multiple aliased exports

Ideally, the `asdf` export wouldn't reference \_default after transformation

Pre-TS input:

```js
export const foo = () => {}
export { foo as asdf }
```

```js
Object.defineProperty(exports, '__esModule', { value: true })
exports.asdf = exports.foo = void 0
exports.foo = () => {}
exports.asdf = exports.foo
```

to

```js
let _default = {}
export const foo = () => {}
_default.foo = foo
export const asdf = _default.foo
_default.asdf = asdf
export default _default
```
