import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  generateIdentifier,
  getProgramBody,
  pathsToRemove,
} from '../helpers'

export const handleWildcardImport = (path: NodePath<t.CallExpression>) => {
  const { node } = path
  if (node.arguments.length !== 1) return
  const requireStatement = node.arguments[0]
  const importPath = getRequirePath(requireStatement)
  if (!importPath) return
  const { parent, parentPath: varPath } = path
  if (!t.isVariableDeclarator(parent) || !t.isIdentifier(parent.id)) return
  pathsToRemove.add(varPath)
  const varScope = path.scope
  const globalScope = varScope.getProgramParent()
  // because we are moving the variable to the global scope, it may conflict
  const newId = generateIdentifier(globalScope, parent.id.name)
  varScope.rename(parent.id.name, newId.name)
  const importNodePath: NodePath<t.ImportDeclaration> = getProgramBody(
    path,
  ).insertBefore([
    t.importDeclaration(
      [t.importNamespaceSpecifier(newId)],
      t.stringLiteral(importPath),
    ),
  ])[0]
  globalScope.registerDeclaration(importNodePath)
}
