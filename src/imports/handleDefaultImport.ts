import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  generateIdentifier,
  injectImportIntoBody,
  getProgramPath,
  replaceBabelSequenceExpressionParent,
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
  const originalBinding = path.scope.getBinding(varName)
  if (!originalBinding) return
  const references = originalBinding.referencePaths

  path.scope.removeBinding(varName)
  const newImportId = generateIdentifier(path.scope, varName)
  varPath.remove()

  const newImport = t.importDeclaration(
    [t.importDefaultSpecifier(newImportId)],
    importPath,
  )
  injectImportIntoBody(getProgramPath(path), newImport)

  // replace all references foo.default with reference to `import`ed
  // Replace foo.default with foo
  // Replace foo with { default: foo }
  references.forEach((ref) => {
    if (ref.parentPath.isMemberExpression()) {
      const memberExpression = ref.parentPath
      if (
        !t.isIdentifier(memberExpression.node.property) ||
        memberExpression.node.property.name !== 'default'
      ) {
        throw memberExpression.buildCodeFrameError(
          'Cannot read property from default export object',
        )
      }
      replaceBabelSequenceExpressionParent(memberExpression, newImportId)
    } else {
      ref.replaceWith(
        t.objectExpression([
          t.objectProperty(t.identifier('default'), newImportId),
        ]),
      )
    }
  })
}
