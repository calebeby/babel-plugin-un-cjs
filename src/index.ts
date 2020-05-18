import { declare } from '@babel/helper-plugin-utils'
import { types as t, NodePath, Visitor } from '@babel/core'
import { writeExports } from './exports/writeExports'
import { handleDefaultImport } from './imports/handleDefaultImport'
import { handleRequire } from './imports/handleRequire'
import { handleWildcardImport } from './imports/handleWildcardImport'
import {
  pathsToRemove,
  isModuleExports,
  isStillInTree,
  isDefaultImportHelper,
  isNamespaceImportHelper,
  isInteropHelper,
} from './helpers'
import { handleAssignmentExpression } from './exports/handleAssignmentExpression'
import { handlePotentialObjectDefineProperty } from './handlePotentialObjectDefineProperty'
import { handlePotentialLazyImportFunction } from './imports/handlePotentialLazyImportFunction'
import {
  handlePotentialBabelWildcardExport,
  handleTSWildcardExport,
} from './exports/handlePotentialWildcardExport'

/**
 * NodePath of:
 * - `AssignmentExpression`:
 *   - `module.exports.foo = 'bar'`
 *   - `exports.foo = 'bar'`
 * - `ObjectProperty` (within `module.exports = {}`):
 *   - `foo: 'bar'`
 * - `CallExpression`:
 *   - `Object.defineProperty(module.exports, 'foo', {
 *       get: function () { return 'bar' }
 *     })`
 */
export type ExportPath =
  | NodePath<t.AssignmentExpression>
  | NodePath<t.ObjectProperty>
  | NodePath<t.CallExpression>

export type NamedExportsMap = Map<string, ExportPath>
export type ModulePathsToReplace = Set<
  NodePath<t.Identifier | t.MemberExpression>
>

const babelPluginUnCjs = declare((api) => {
  api.assertVersion(7)

  const namedExports: NamedExportsMap = new Map()
  const modulePathsToReplace: ModulePathsToReplace = new Set()

  let bail = false
  const visitor: Visitor = {
    Program: {
      exit(programPath) {
        if (!bail) {
          ;[...pathsToRemove.values()].forEach((p) => p.remove())
          if (namedExports.size !== 0)
            writeExports(programPath, modulePathsToReplace, namedExports)
        }

        // reset state
        bail = false
        pathsToRemove.clear()
        namedExports.clear()
        modulePathsToReplace.clear()
      },
    },

    CallExpression(path) {
      const { node } = path
      // (path.removed on a node does not reflect ancestor removal)
      if (!isStillInTree(path)) return
      handlePotentialObjectDefineProperty(path, namedExports)
      if (!t.isIdentifier(node.callee)) {
        // Handle transforming babel export * from "" blocks like this:
        // var _waitFor = require("./wait-for");
        // Object.keys(_waitFor).forEach(function (key) {
        //   if (key === "default" || key === "__esModule") return;
        //   if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
        //   Object.defineProperty(exports, key, {
        //     enumerable: true,
        //     get: function () {
        //       return _waitFor[key];
        //     }
        //   });
        // });
        handlePotentialBabelWildcardExport(path, visitor)
        return
      }
      if (isDefaultImportHelper(node.callee.name)) {
        handleDefaultImport(path)
      } else if (isNamespaceImportHelper(node.callee.name)) {
        handleWildcardImport(path)
      } else if (node.callee.name === '__exportStar') {
        handleTSWildcardExport(path)
      } else if (node.callee.name === 'require') {
        handleRequire(path)
      }
    },

    SequenceExpression(path) {
      //  Babel commonjs will transpile foo() to ;(0, _foo)()
      //  Replaces (0, _foo) with _foo

      const isLength2 = path.node.expressions.length === 2
      const firstElement = path.node.expressions[0]
      const secondElement = path.node.expressions[1]
      if (isLength2 && t.isLiteral(firstElement)) {
        path.replaceWith(secondElement)
      }
    },

    Identifier(path) {
      if (path.node.name !== 'exports') return
      const parent = path.parentPath
      // If the parent is module.exports, use that instead of just exports
      if (parent.isMemberExpression() && isModuleExports(parent.node)) {
        modulePathsToReplace.add(parent)
      } else {
        modulePathsToReplace.add(path)
      }
    },

    Directive(path) {
      // Since we are converting to ESM, the "use strict" directive is not needed
      if (path.node.value.value === 'use strict') path.remove()
    },

    VariableDeclarator(path) {
      if (t.isIdentifier(path.node.id) && isInteropHelper(path.node.id.name)) {
        path.remove()
      }
    },

    FunctionDeclaration(path) {
      if (path.node.id && isInteropHelper(path.node.id.name)) {
        path.remove()
        return
      }
      // Handle transforming babel lazy import blocks like this:
      // function _parser() {
      //   const data = require("@babel/parser");
      //   _parser = function () {
      //     return data;
      //   };
      //   return data;
      // }
      handlePotentialLazyImportFunction(path)
    },

    AssignmentExpression(path) {
      handleAssignmentExpression(path, modulePathsToReplace, namedExports)
    },
  }

  return { visitor }
})

export default babelPluginUnCjs
