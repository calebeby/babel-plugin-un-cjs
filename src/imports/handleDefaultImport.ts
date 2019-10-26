import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  getProgramPath,
  generateIdentifier,
  getProgramBody,
  pathsToRemove,
} from '../helpers'

export const handleDefaultImport = (path: NodePath<t.CallExpression>) => {
  const { node } = path
  if (node.arguments.length !== 1) return
  const requireStatement = node.arguments[0]
  const importPath = getRequirePath(requireStatement)
  if (!importPath) return
  const { parent, parentPath: varPath } = path
  if (!t.isVariableDeclarator(parent) || !t.isIdentifier(parent.id)) return
  const varName = parent.id.name
  const binding = path.scope.getBinding(varName)
  if (!binding) return
  const programPath = getProgramPath(path)
  const globalScope = path.scope.getProgramParent()
  const globalBinding = globalScope.getBinding(parent.id.name)
  // because we are moving the variable to the global scope, it may conflict
  // it is safe to use the original name if the declaration of the variable is in the global scope already and it is const
  const useOriginalName =
    globalBinding && globalBinding.path === varPath && globalBinding.constant
  const newImportId = useOriginalName
    ? parent.id
    : generateIdentifier(globalScope, varName)
  const newImport = t.importDeclaration(
    [t.importDefaultSpecifier(newImportId)],
    t.stringLiteral(importPath),
  )
  const newPath = getProgramBody(programPath).insertBefore([newImport])[0]

  pathsToRemove.add(varPath)
  // replace all references foo.default with reference to `import`ed
  binding.referencePaths.forEach(referencePath => {
    const { parent, parentPath } = referencePath
    if (!t.isMemberExpression(parent)) {
      // if it isn't foo.default (for example if it was generated with babel lazy modules)
      // then we want it to return {default: foo}
      referencePath.replaceWith(
        t.objectExpression([
          t.objectProperty(t.identifier('default'), newImportId),
        ]),
      )
      return
    }
    const { property } = parent
    if (!t.isIdentifier(property) || property.name !== 'default') return
    parentPath.replaceWith(newImportId)
  })
  globalScope.registerDeclaration(newPath)
}
