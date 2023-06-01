# babel-plugin-un-cjs

## 2.6.0

### Minor Changes

- [`428d52a`](https://github.com/calebeby/babel-plugin-un-cjs/commit/428d52a249b1056177070fcffaf3dfb0a1a64833) Thanks [@calebeby](https://github.com/calebeby)! - Handle edge case: instance methods of `Function.prototype`:

  If an imported binding _only_ is referenced using properties of `Function.prototype`, this suggests that the imported binding itself is probably a function instead of a namespace, so we create a default import instead of a namespace import.

  ```js
  var bind = require('function-bind')

  bind.call(Function.call, Object.prototype.hasOwnProperty)
  ```

  to

  ```js
  import bind from 'function-bind'
  bind.call(Function.call, Object.prototype.hasOwnProperty)
  ```

## 2.5.0

### Minor Changes

- [`d61b766`](https://github.com/calebeby/babel-plugin-un-cjs/commit/d61b7665300e3bdbc01f90f7ce29b700d9f72310) Thanks [@calebeby](https://github.com/calebeby)! - Fix an edge case where `export * from ""` generated an extra import/export of default

## 2.4.0

### Minor Changes

- [`345f7ee`](https://github.com/calebeby/babel-plugin-un-cjs/commit/345f7ee1d1b9a9090035024bc18cc70e48c0b437) Thanks [@calebeby](https://github.com/calebeby)! - Handle babel-generated "export {...} from "..."

## 2.3.0

### Minor Changes

- [`4c1f3a5`](https://github.com/calebeby/babel-plugin-un-cjs/commit/4c1f3a5bb6193fa8c696583783d63222dd9a235e) Thanks [@calebeby](https://github.com/calebeby)! - Improve handling of assigning directly to module.exports = ...

## 2.2.1

### Patch Changes

- [`ec2f33b`](https://github.com/calebeby/babel-plugin-un-cjs/commit/ec2f33b728b3f59149299ab570cddff3af290310) Thanks [@calebeby](https://github.com/calebeby)! - Handle changed babel output for `export * from ""`

  The change was introduced in babel PR https://github.com/babel/babel/pull/11739. This was first released as babel v7.12.0. Both the old and new output are supported by babel-plugin-un-cjs

## 2.2.0

### Minor Changes

- [`f47689a`](https://github.com/calebeby/babel-plugin-un-cjs/commit/f47689a6b84fdc48991508aec19e1e981e8862a3) Thanks [@calebeby](https://github.com/calebeby)! - Add @babel/core as a peerDependency

## 2.1.0

### Minor Changes

- [`ebc7ed4`](https://github.com/calebeby/babel-plugin-un-cjs/commit/ebc7ed4525ec0aac6cf504d0baba89e010b3369f) Thanks [@calebeby](https://github.com/calebeby)! - Add semantic release
