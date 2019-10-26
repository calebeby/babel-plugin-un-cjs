import { declare } from '@babel/helper-plugin-utils'
import { types as t, NodePath } from '@babel/core'
import { writeExports } from './exports/writeExports'
import { handleDefaultImport } from './imports/handleDefaultImport'
import { handleNamedImport } from './imports/handleNamedImport'
import { handleWildcardImport } from './imports/handleWildcardImport'
import { pathsToRemove, isTopLevel } from './helpers'
import { handlePotentialExport } from './exports/handlePotentialExport'
import { handlePotentialObjectDefineProperty } from './handlePotentialObjectDefineProperty'

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

export default declare(api => {
  api.assertVersion(7)

  const namedExports: NamedExportsMap = new Map()
  const modulePathsToReplace: ModulePathsToReplace = new Set()

  let bail = false

  return {
    visitor: {
      Program: {
        exit(programPath) {
          if (!bail) {
            Array.from(pathsToRemove.values()).forEach(p => p.remove())
            writeExports(programPath, modulePathsToReplace, namedExports)
          } else {
            console.log('bail', programPath.hub.file.opts.filename)
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
        handlePotentialObjectDefineProperty(path, namedExports)
        if (!t.isIdentifier(node.callee)) return
        if (
          node.callee.name.match(/interopRequireDefault/) ||
          node.callee.name === '__importDefault'
        ) {
          handleDefaultImport(path)
        } else if (
          node.callee.name.match(/interopRequireWildcard/) ||
          node.callee.name === '__importStar'
        ) {
          handleWildcardImport(path)
        } else if (node.callee.name === 'require') {
          handleNamedImport(path)
        }
      },

      Identifier(path) {
        if (path.node.name === 'exports') {
          modulePathsToReplace.add(path)
        } else if (path.node.name === 'global') {
          path.replaceWith(t.identifier('window'))
        }
      },

      AssignmentExpression(path) {
        const { node } = path

        if (bail) return

        // We must bail if there is a non-static export

        if (!isTopLevel(path)) {
          // assignment that is not in the top-level program
          // we want to see if module.exports or exports is modified
          // if it is, we bail on all exports modifications in this file

          if (t.isIdentifier(node.left)) {
            if (node.left.name === 'exports') bail = true
          } else {
            // there are cases where this will think that module is getting modified but it actually isn't
            // for example (module ? obj1 : obj2).exports = 'false' will never modify module.exports
            // but that is too complicated to handle for now.
            path.get('left').traverse({
              Identifier(path) {
                if (path.node.name === 'module') bail = true
              },
            })
          }
          // regardless of whether we are bailing on exports modifications in the entire file,
          // we do not need to continue for this assignment because it is not in the top level
          return
        }

        handlePotentialExport(path, modulePathsToReplace, namedExports)
      },
    },
  }
})
