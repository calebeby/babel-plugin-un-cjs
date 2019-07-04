# Export Behavior

```js
module.exports.foo = 'asdf'
```

to

```js
let _default = {}
export const foo = 'asdf'
_default.foo = foo
export default _default
```
