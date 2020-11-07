---
'babel-plugin-un-cjs': patch
---

Handle changed babel output for `export * from ""`

The change was introduced in babel PR https://github.com/babel/babel/pull/11739. This was first released as babel v7.12.0. Both the old and new output are supported by babel-plugin-un-cjs
