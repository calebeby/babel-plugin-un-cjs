import { declare } from '@babel/helper-plugin-utils'
import { types as t, NodePath, Visitor } from '@babel/core'
import { handleDefaultImport } from './imports/handleDefaultImport'
import { handleRequire } from './imports/handleRequire'
import { handleWildcardImport } from './imports/handleWildcardImport'
import {
  isStillInTree,
  isDefaultImportHelper,
  isNamespaceImportHelper,
  isInteropHelper,
} from './helpers'
import { handlePotentialLazyImportFunction } from './imports/handlePotentialLazyImportFunction'
import {
  handlePotentialBabelWildcardExport,
  handleTSWildcardExport,
} from './exports/handleWildcardExport'
import { handleExports } from './exports/handleExports'
import { handleIdentifier } from './exports/handleIdentifier'

export interface State {
  /** Array of _all_ identifier paths which reference `module` or `exports` */
  referencesToExports: NodePath<t.Identifier | t.JSXIdentifier>[]
}

const babelPluginUnCjs = declare((api) => {
  api.assertVersion(7)

  let state: State = {
    referencesToExports: [],
  }

  const visitor: Visitor = {
    Program: {
      exit(programPath) {
        handleExports(programPath, state)
        state = { referencesToExports: [] }
      },
    },

    CallExpression(path) {
      const { node } = path
      // (path.removed on a node does not reflect ancestor removal)
      if (!isStillInTree(path)) return
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
      handleIdentifier(path, state)
    },
    JSXIdentifier(path) {
      handleIdentifier(path, state)
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
  }

  return { visitor }
})

export default babelPluginUnCjs
