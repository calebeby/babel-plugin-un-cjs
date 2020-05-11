# Require Single Property, assigned to variable

// TODO: Verify import ordering
// TODO: What about optional chaining? What would that entail?

```js
const asdf = require('file').foo
```

to

```js
import { foo as asdf } from 'file'
```

# Require single property, assigned to variable in sub scope

This test uses JSX to make sure `JSXIdentifier` references are updated, not just `Identifier`s

```js
const S = 'dont override me'
const main = () => {
  const S = require('file').foo
  S.asdf()
  console.log(<S>Hi</S>)
}
const other = () => {
  S.asdf()
}
```

to

```js
import { foo as _S } from 'file'
const S = 'dont override me'

const main = () => {
  _S.asdf()

  console.log(<_S>Hi</_S>)
}

const other = () => {
  S.asdf()
}
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
const s = () => {
  const _foo = 'dont override me'
  console.log(require('file').foo)
}
```

to

```js
import { foo as _foo2 } from 'file'
const foo = 'dont override me'

const s = () => {
  const _foo = 'dont override me'
  console.log(_foo2)
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
