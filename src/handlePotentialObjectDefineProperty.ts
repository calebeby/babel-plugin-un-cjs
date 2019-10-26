import { NodePath, types as t } from '@babel/core'
import { pathsToRemove, isModuleExports } from './helpers'
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
  const args = path.node.arguments
  if (
    !t.isMemberExpression(path.node.callee) ||
    !t.isIdentifier(path.node.callee.object) ||
    !t.isIdentifier(path.node.callee.property) ||
    path.node.callee.object.name !== 'Object' ||
    path.node.callee.property.name !== 'defineProperty' ||
    args.length !== 3
  )
    return
  const [objArg, propNameArg, optsArg] = args
  // Ensure object is exports or module.exports
  if (
    !(
      (t.isIdentifier(objArg) && objArg.name === 'exports') ||
      (t.isMemberExpression(objArg) && isModuleExports(objArg))
    )
  )
    return

  if (!t.isStringLiteral(propNameArg)) return
  if (!t.isObjectExpression(optsArg)) return

  // Remove Object.defineProperty(exports, '__esModule', { value: true })
  if (propNameArg.value === '__esModule') {
    if (optsArg.properties.length !== 1) return
    const prop = optsArg.properties[0]

    if (
      !(
        t.isObjectProperty(prop) &&
        t.isIdentifier(prop.key) &&
        prop.key.name === 'value' &&
        t.isBooleanLiteral(prop.value) &&
        prop.value.value === true
      )
    )
      return

    pathsToRemove.add(path)
  }

  // Verify that it's shaped correctly
  // Then handle it as an export

  /** The `get` property on the defineProperty config object */
  const getProp = optsArg.properties.find(
    (p): p is t.ObjectProperty =>
      t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === 'get',
  )

  if (!getProp) return
  if (!t.isFunctionExpression(getProp.value)) return

  const innerFunc = getProp.value
  const firstStatement = innerFunc.body.body[0]
  if (innerFunc.body.body.length === 1 && t.isReturnStatement(firstStatement))
    namedExports.set(propNameArg.value, path)
}
