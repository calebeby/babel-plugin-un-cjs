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

# Assign module.exports = id => function

```js
function eq(value, other) {}

module.exports = eq
```

to

```js
function eq(value, other) {}
export default eq
let _exports = eq
```

# Assign module.exports = id => class

```js
class eq {}

module.exports = eq
```

to

```js
class eq {}
export default eq
let _exports = eq
```

# Assign module.exports = id => assignment

```js
let meaningOfLife = 42
meaningOfLife = 'jk'

module.exports = meaningOfLife
```

to

```js
let meaningOfLife = 42
meaningOfLife = 'jk'
export default meaningOfLife
let _exports = meaningOfLife
```

# Assign module.exports = id => require

```js
const matchers = require('./dist/matchers')
module.exports = matchers
```

to

```js
export * from './dist/matchers'
```

# Assign module.exports = require

```js
module.exports = require('./dist/matchers')
```

to

```js
export * from './dist/matchers'
```
