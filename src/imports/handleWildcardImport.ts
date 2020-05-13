import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  generateIdentifier,
  injectImportIntoBody,
  updateReferencesTo,
  getProgramPath,
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
  )
    return
  const originalId = variableDeclarator.node.id
  const originalBinding = variableDeclarator.scope.getBinding(originalId.name)
  if (!originalBinding) return
  const references = originalBinding.referencePaths
  variableDeclarator.scope.removeBinding(originalId.name)
  const newId = generateIdentifier(variableDeclarator.scope, originalId)
  variableDeclarator.remove()
  const program = getProgramPath(path)

  const newImport = t.importDeclaration(
    [t.importNamespaceSpecifier(newId)],
    importPath,
  )
  const importNodePath = injectImportIntoBody(program, newImport)
  updateReferencesTo(references, newId)
}
