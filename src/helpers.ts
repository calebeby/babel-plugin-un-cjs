import { NodePath, types as t } from '@babel/core'
import { Scope } from '@babel/traverse'

// we are storing them here instead of removing them right away in case we bail
// on export modification
export const pathsToRemove = new Set<NodePath>()

export const getRequirePath = (requireStatement: t.Node) => {
  if (
    !t.isCallExpression(requireStatement) ||
    !t.isIdentifier(requireStatement.callee) ||
    requireStatement.callee.name !== 'require' ||
    requireStatement.arguments.length !== 1
  ) {
    return
  }
  const importPathArg = requireStatement.arguments[0]
  if (!t.isStringLiteral(importPathArg)) return
  return importPathArg
}

export const getProgramPath = (path: NodePath<unknown>) =>
  path.find(p => p.isProgram()) as NodePath<t.Program>

export const getProgramBody = (path: NodePath<unknown>) =>
  getProgramPath(path).get('body.0') as NodePath<t.Node>

const reserved = ['default', 'super', 'import']

export const generateIdentifier = (scope: Scope, name: string) =>
  scope.hasBinding(name) || reserved.includes(name)
    ? scope.generateUidIdentifier(name)
    : t.identifier(name)

/** Object.assign but for maps */
export const assignMaps = <Key, Val>(
  map: Map<Key, Val>,
  ...sources: (Map<Key, Val>)[]
) => {
  for (let source of sources) {
    const entries = source.entries()
    for (let entry of entries) map.set(...entry)
  }
}

/**
 * From a descendent, go up until you hit a direct child of the program path
 */
export const findParentProgramChild = (path: NodePath) =>
  path.find(p => p.parentPath.isProgram())

export const everyParent = (
  path: NodePath,
  condition: (p: NodePath) => boolean,
): boolean => {
  if (condition(path) && path.isProgram()) return true
  if (condition(path)) {
    return everyParent(path.parentPath, condition)
  }
  return false
}

export const isModuleExports = (node: t.MemberExpression): boolean =>
  t.isIdentifier(node.object) &&
  node.object.name === 'module' &&
  t.isIdentifier(node.property) &&
  node.property.name === 'exports'

export const isTopLevel = (path: NodePath) =>
  t.isProgram(path.parentPath.parent) ||
  everyParent(
    path,
    p =>
      // workaround to allow for: const foo = module.exports = 'asdf'
      (p.isProgram() ||
        p.isAssignmentExpression() ||
        p.isVariableDeclaration() ||
        p.isVariableDeclarator()) &&
      p.parentKey !== 'right',
  )
