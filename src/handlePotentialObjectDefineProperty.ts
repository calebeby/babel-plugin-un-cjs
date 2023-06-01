import { NodePath, types as t } from '@babel/core'
import { pathsToRemove, isModuleExports, isExports } from './helpers'
import { NamedExportsMap } from '.'

// Remove:
// Object.defineProperty(exports, '__esModule', {
//   value: true
// });

// Create export for babel lazy output:
// Object.defineProperty(exports, 'foo', {
//   get: function () {
//     return foo;
//   }
// });

export const handlePotentialObjectDefineProperty = (
  path: NodePath<t.CallExpression>,
  namedExports: NamedExportsMap,
) => {
  const returned = isObjectDefinePropertyExport(path)
  if (returned) {
    const [exportedName] = returned

    namedExports.set(exportedName, path)
  }
}

/**
 * Checks whether a given function call is in this format:
 * Object.defineProperty(exports, 'foo', {
 *   get: function () {
 *     return foo;
 *   }
 * If it is, returns the path of the foo identifier returned by the getter and the name of the export
 * Otherwise returns false
 */
export const isObjectDefinePropertyExport = (
  path: NodePath<t.CallExpression>,
) => {
  const args = path.node.arguments
  if (
    !t.isMemberExpression(path.node.callee) ||
    !t.isIdentifier(path.node.callee.object) ||
    !t.isIdentifier(path.node.callee.property) ||
    path.node.callee.object.name !== 'Object' ||
    path.node.callee.property.name !== 'defineProperty' ||
    args.length !== 3
  )
    return false
  const [objArg, propNameArg, optsArg] = args
  if (!(isExports(objArg) || isModuleExports(objArg))) return false

  if (!t.isStringLiteral(propNameArg)) return false
  if (!t.isObjectExpression(optsArg)) return false

  // Remove Object.defineProperty(exports, '__esModule', { value: true })
  if (propNameArg.value === '__esModule') {
    if (optsArg.properties.length !== 1) return false
    const prop = optsArg.properties[0]

    if (
      !(
        t.isObjectProperty(prop) &&
        t.isIdentifier(prop.key) &&
        prop.key.name === 'value' &&
        t.isBooleanLiteral(prop.value) &&
        prop.value.value
      )
    )
      return false

    pathsToRemove.add(path)
    return false
  }

  // Verify that it's shaped correctly
  // Then handle it as an export

  /** The `get` property on the defineProperty config object */
  const getProp = optsArg.properties.find(
    (p): p is t.ObjectProperty =>
      t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === 'get',
  )

  if (!getProp || !t.isFunctionExpression(getProp.value)) return false

  const innerFunc = getProp.value
  const firstStatement = innerFunc.body.body[0]
  if (innerFunc.body.body.length === 1 && t.isReturnStatement(firstStatement))
    return [propNameArg.value, firstStatement.argument] as const

  return false
}
