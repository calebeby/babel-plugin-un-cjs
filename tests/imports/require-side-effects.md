# Require for side effects gets changed to import for side effects

```js
require('side-effect')
```

to

```js
import 'side-effect'
```

# Require for side effects works even in sub scopes:

```js
;() => {
  require('side-effect')
}
```

to

```js
import 'side-effect'
;() => {}
```

# When it is in an implicit return, it might not just be for side effects

TODO: move this test to require-top-level

```js
;() => require('side-effect')
```

to

```js
import sideeffect from 'side-effect'
;() => sideeffect
```

# Require for side effects is imported regardless of conditionals

Because it is a static import

```js
if (foo) require('side-effect')
```

to

```js
import 'side-effect'
if (foo) {
}
```

# Hoisted imports are moved below existing imports to try to preserve import order

```js
require('other-module')
const s = () => {
  require('hi')
}
```

to

```js
import 'other-module'
import 'hi'
const s = () => {}
```
