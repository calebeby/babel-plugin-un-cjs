# color-name (https://unpkg.com/color-name@1.1.4/index.js)

This one is tricky because it has string keys as properties on the export object, which need to be converted to identifiers if they have valid characters.

<!-- prettier-ignore -->
```js
'use strict'

module.exports = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aq-ua": [0, 255, 255],
};
```

to

```js
export const aliceblue = [240, 248, 255]
export const antiquewhite = [250, 235, 215]
let _exports = {
  aliceblue: aliceblue,
  antiquewhite: antiquewhite,
  'aq-ua': [0, 255, 255],
}
export default _exports
```
