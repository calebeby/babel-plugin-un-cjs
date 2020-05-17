# Assign module.exports = function

```js
module.exports = function () {}
console.log(module.exports)
```

to

```js
let _default = function () {}

console.log(_default)
export default _default
```

# Assign module.exports = arrow function

```js
module.exports = () => {}
```

to

```js
let _default = () => {}

export default _default
```

# Assign module.exports = class

```js
module.exports = class {}
```

to

```js
let _default = class {}

export default _default
```
