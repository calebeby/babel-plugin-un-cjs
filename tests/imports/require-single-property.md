# Require Single Property Shorthand

heres some text

blah

```js
const asdf = require('file').foo
```

to

```js
import { foo as asdf } from 'file'
```

# Require Single Property Within Expression

```js
console.log(require('file').foo)
```

to

```js
import { foo } from 'file'
console.log(foo)
```

And it makes sure that existing variables don't get overridden:

```js
const foo = 'dont override me'
console.log(require('file').foo)
```

to

```js
import { foo as _foo } from 'file'
const foo = 'dont override me'
console.log(_foo)
```

# (skip) Require single property, used in sub scope

(not implemented)

```js
const s = 'dont override me'
const foo = 'dont override me'
const main = () => {
  const s = require('file').foo
}
```

to

```js
import { foo as _foo } from 'file'
const s = 'dont override me'
const foo = 'dont override me'
const main = () => {
  const s = _foo
}
```

# Require Single Property Within Destructuring

```js
const { asdf } = require('file').foo
```

to

```js
import { foo } from 'file'
const { asdf } = foo
```

And it makes sure that existing variables don't get overridden:

```js
const foo = 'dont override me'
const { asdf } = require('file').foo
```

to

```js
import { foo as _foo } from 'file'
const foo = 'dont override me'
const { asdf } = _foo
```
