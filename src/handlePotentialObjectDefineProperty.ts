import { NodePath, types as t } from '@babel/core'
import { pathsToRemove, isModuleExports } from './helpers'

// Remove:

// Object.defineProperty(exports, '__esModule', {
//   value: true
// });

export const handlePotentialObjectDefineProperty = (
  path: NodePath<t.CallExpression>,
) => {
  const args = path.node.arguments
  if (
    !t.isMemberExpression(path.node.callee) ||
    !t.isIdentifier(path.node.callee.object) ||
    !t.isIdentifier(path.node.callee.property) ||
    args.length !== 3
  )
    return
  const objArg = args[0]
  if (
    !(
      (t.isIdentifier(objArg) && objArg.name === 'exports') ||
      (t.isMemberExpression(objArg) && isModuleExports(objArg))
    )
  )
    return
  const propArg = args[1]
  if (!(t.isStringLiteral(propArg) && propArg.value === '__esModule')) return

  const optsArg = args[2]
  if (!(t.isObjectExpression(optsArg) && optsArg.properties.length === 1))
    return

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
