import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  generateIdentifier,
  injectImportIntoBody,
  updateReferencesTo,
  getProgramPath,
  importPathNameToIdentifierName,
} from '../helpers'

export const handleWildcardImport = (path: NodePath<t.CallExpression>) => {
  const { node } = path
  if (node.arguments.length !== 1) return
  const requireStatement = node.arguments[0]
  const importPath = getRequirePath(requireStatement)
  if (!importPath) return
  const variableDeclarator = path.parentPath
  if (
    !variableDeclarator.isVariableDeclarator() ||
    !t.isIdentifier(variableDeclarator.node.id)
  ) {
    const newId = generateIdentifier(
      path.scope,
      importPathNameToIdentifierName(importPath.value),
    )
    const newImport = t.importDeclaration(
      [t.importNamespaceSpecifier(newId)],
      importPath,
    )
    injectImportIntoBody(getProgramPath(path), newImport)
    path.replaceWith(newId)
    return
  }
  const originalId = variableDeclarator.node.id
  const originalBinding = variableDeclarator.scope.getBinding(originalId.name)
  if (!originalBinding) return
  const references = originalBinding.referencePaths
  variableDeclarator.scope.removeBinding(originalId.name)
  const newId = generateIdentifier(variableDeclarator.scope, originalId)
  variableDeclarator.remove()

  const newImport = t.importDeclaration(
    [t.importNamespaceSpecifier(newId)],
    importPath,
  )
  injectImportIntoBody(getProgramPath(path), newImport)
  updateReferencesTo(references, newId)
}
