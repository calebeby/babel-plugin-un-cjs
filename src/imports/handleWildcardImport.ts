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
  const { parent: variableDeclarator, parentPath: varPath } = path
  if (
    !t.isVariableDeclarator(variableDeclarator) ||
    !t.isIdentifier(variableDeclarator.id)
  )
    return
  const oldId = variableDeclarator.id
  pathsToRemove.add(varPath)
  const varScope = path.scope
  const globalScope = varScope.getProgramParent()
  const globalBinding = globalScope.getBinding(oldId.name)
  // because we are moving the variable to the global scope, it may conflict
  // it is safe to use the original name if the declaration of the variable is in the global scope already and it is const
  const useOriginalName =
    globalBinding && globalBinding.path === varPath && globalBinding.constant
  const newId = useOriginalName
    ? oldId
    : generateIdentifier(globalScope, oldId.name)
  if (!useOriginalName) {
    varScope.rename(oldId.name, newId.name)
    globalScope.removeBinding(oldId.name)
  }
  const importNodePath: NodePath<t.ImportDeclaration> = getProgramBody(
    path,
  ).insertBefore([
    t.importDeclaration([t.importNamespaceSpecifier(newId)], importPath),
  ])[0]
  globalScope.registerDeclaration(importNodePath)
}
