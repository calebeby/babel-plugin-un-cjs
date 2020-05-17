# Assign module.exports = function

```js
module.exports = function () {}
console.log(module.exports)
```

to

```js
let _exports = function () {}

console.log(_exports)
export default _exports
```

# Assign module.exports = arrow function

```js
module.exports = () => {}
```

to

```js
let _exports = () => {}

export default _exports
```

# Assign module.exports = class

```js
module.exports = class {}
```

to

```js
let _exports = class {}

export default _exports
```
