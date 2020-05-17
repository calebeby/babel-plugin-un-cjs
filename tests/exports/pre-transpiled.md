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
let _exports = {}

const foo = () => {}

export { foo }
_exports.foo = foo

const asdf = () => {}

var _default = asdf
export default _default
_exports.default = _default
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
let _exports = {}
export const foo = () => {}
_exports.foo = foo

const asdf = () => {}

export default asdf
_exports.default = asdf
```

# Transforms babel output with multiple aliased exports

```js
exports.asdf = exports.foo = void 0

const foo = () => {}

exports.asdf = exports.foo = foo
```

to

```js
let _exports = {}

const foo = () => {}

export { foo as asdf }
export { foo }
_exports.asdf = _exports.foo = foo
export default _exports
```

# Transforms TS output with multiple aliased exports

Ideally, the `asdf` export wouldn't reference \_exports after transformation

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
let _exports = {}
export const foo = () => {}
_exports.foo = foo
export const asdf = _exports.foo
_exports.asdf = asdf
export default _exports
```
