# Removes unused assignments to void 0 (babel generates these)

```js
module.exports.asdf = void 0
module.exports.asdf = () => {}
```

to

```js
let _exports = {}
export const asdf = () => {}
_exports.asdf = asdf
export default _exports
```

Also works for nested assignments:

```js
module.exports.asdf = module.exports.foo = void 0
module.exports.asdf = () => {}
module.exports.foo = 'foo'
```

to

```js
let _exports = {}
export const asdf = () => {}
_exports.asdf = asdf
export const foo = 'foo'
_exports.foo = foo
export default _exports
```

# Removes unused assignments to undefined

```js
module.exports.asdf = undefined
module.exports.asdf = () => {}
```

to

```js
let _exports = {}
export const asdf = () => {}
_exports.asdf = asdf
export default _exports
```

# Does not remove assignments to something else, even if it has no side effects

Yes, it would be possible to remove the first assignment in this case. But you probably shouldn't, because there is the case where `module.exports.asdf` was referenced between the 1st and 2nd assignment. Removing the 1st assignment would result in `undefined`. In order to handle that, it would involve a _lot_ of ordering checks and it would be difficult to have a non-buggy implementation. So you probably shouldn't try to do that

```js
module.exports.asdf = 'asdf'
module.exports.asdf = () => {}
```

to

```js
let _exports = {}
_exports.asdf = 'asdf'
export const asdf = () => {}
_exports.asdf = asdf
export default _exports
```
