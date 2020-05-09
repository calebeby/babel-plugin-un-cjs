# `babel-plugin-un-cjs`

Tries to convert a commonjs module to an esm module to be pulled into rollup or another bundler

THIS IS UNSTABLE

USE WITH CAUTION

There are many many many edge cases that won't work with this. Many or most ways that commonjs is used will work with this plugin. If you find a case that doesn't work, you can open an issue. No guarantees on whether it can or will be fixed.

## Priorities

1. Preserve functionality with default export.
2. Create additional named exports as is possible
