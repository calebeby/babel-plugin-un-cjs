import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  generateIdentifier,
  getProgramPath,
  injectImportIntoBody,
  updateReferencesTo,
} from '../helpers'

/**
 * Deprecated, plz migrate to injectImportIntoBody
 */
const injectImport = (path: NodePath, newImport: t.ImportDeclaration) => {
  const programPath = getProgramPath(path)
  programPath.unshiftContainer('body', newImport)
  const newImportPath = programPath.get('body.0') as NodePath<
    t.ImportDeclaration
  >
  programPath.scope.registerDeclaration(newImportPath)
}

export const handleRequire = (path: NodePath<t.CallExpression>) => {
  const { node } = path
  const importString = getRequirePath(node)
  if (!importString) return
  const parent = path.parentPath
  const program = getProgramPath(path)
  if (parent.isExpressionStatement()) {
    // require('asdf') (side effects import only)
    const expressionStatement = parent
    const newImport = t.importDeclaration([], importString)
    if (expressionStatement.parentPath.isProgram()) {
      expressionStatement.replaceWith(newImport)
    } else {
      injectImportIntoBody(program, newImport).type
      expressionStatement.remove()
    }

    return
  }
  if (parent.isMemberExpression() && t.isIdentifier(parent.node.property)) {
    // handling require('asdf').foo
    // transforms to import {foo} from 'asdf' and replace expression with foo
    const memberExp = parent
    /** .foo */
    const importedId = parent.node.property
    if (
      memberExp.parentPath.isVariableDeclarator() &&
      t.isIdentifier(memberExp.parentPath.node.id)
    ) {
      // special case: handling const asdf = require('asdf').foo
      // transforms to import {foo as asdf} from 'asdf'
      // If the variable declaration was in a scope that was not the root scope
      // Then it checks to make sure that the asdf name is available in this scope (and all above scopes)
      // If not, it finds another name and updates the references
      // MAKE SURE to _not_ handle const {asdf} = require('asdf').foo
      const originalId = memberExp.parentPath.node.id
      const variableDeclarator = memberExp.parentPath
      const originalBinding = variableDeclarator.scope.getBinding(
        originalId.name,
      )
      if (!originalBinding) return
      const references = originalBinding.referencePaths
      variableDeclarator.scope.removeBinding(originalId.name)
      const localId = generateIdentifier(path.scope, originalId)
      const newImport = t.importDeclaration(
        [t.importSpecifier(localId, importedId)],
        importString,
      )
      variableDeclarator.remove()
      injectImportIntoBody(program, newImport)
      updateReferencesTo(references, localId)
      return
    }
    const localId = generateIdentifier(path.scope, importedId)
    const newImport = t.importDeclaration(
      [t.importSpecifier(localId, importedId)],
      importString,
    )
    injectImport(path, newImport)
    memberExp.replaceWith(localId)
    return
  }
  if (!parent.isVariableDeclarator()) {
    // Handling cases where require statement is within another expression
    // console.log(require('foo'))
    // Becomes
    // import foo from 'foo'; console.log(foo)

    const id = generateIdentifier(
      path.scope,
      importString.value.replace(/[^a-zA-Z]/g, ''),
    )
    const newImport = t.importDeclaration(
      [t.importDefaultSpecifier(id)],
      importString,
    )
    injectImportIntoBody(program, newImport)
    path.replaceWith(id)
    return
  }
  const variableDeclarator = parent
  // const foo = require('asdf')
  const originalId = variableDeclarator.node.id
  if (t.isObjectPattern(originalId)) {
    // Handling destructured require:
    // const { a, foo: bar } = require("....")

    const importSpecifiers: t.ImportSpecifier[] = []
    // Stores all of the references to each specifier
    const references = new Set<{
      newId: t.Identifier
      references: NodePath<t.Node>[]
    }>()

    for (const prop of originalId.properties) {
      if (!t.isObjectProperty(prop)) return
      // ignore rest element, can't do that
      // TODO: Potentially in the future we can handle rest/spread with namespace import
      const originalLocalId = prop.value
      const importedId = prop.key
      if (!t.isIdentifier(originalLocalId) || !t.isIdentifier(importedId))
        return
      const originalBinding = variableDeclarator.scope.getBinding(
        originalLocalId.name,
      )
      if (!originalBinding) continue
      variableDeclarator.scope.removeBinding(originalLocalId.name)
      const newLocalId = generateIdentifier(path.scope, originalLocalId)
      references.add({
        newId: newLocalId,
        references: originalBinding.referencePaths,
      })
      importSpecifiers.push(t.importSpecifier(newLocalId, importedId))
    }
    const newImport = t.importDeclaration(importSpecifiers, importString)
    injectImportIntoBody(program, newImport)
    references.forEach(({ newId, references }) => {
      updateReferencesTo(references, newId)
    })
    variableDeclarator.remove()
    return
  }
  if (!t.isIdentifier(originalId)) return

  // const foo = require('bar')
  // Two possible situations here:
  // 1. Never using foo directly, only properties like foo.bar and foo.baz:
  //    -> import * as foo from 'bar'
  // 2. Uses foo directly, and may additionally use properties (or foo is not used at all, directly or on a sub-property)
  //    -> import foo from 'bar'
  //    To ponder: Should a second import (namespace import) be created for the properties?
  //    How do we know if something is meant to be a property of the default export vs a separate export?

  const originalBinding = path.scope.getBinding(originalId.name)
  if (!originalBinding) return
  const references = originalBinding.referencePaths
  path.scope.removeBinding(originalId.name)
  const localId = generateIdentifier(path.scope, originalId)
  path.parentPath.remove()

  const useDefault =
    references.length === 0 ||
    references.some(
      (referencePath) =>
        // at least one of the references is foo directly instead of a property
        !t.isMemberExpression(referencePath.parent),
    )

  const newImport = t.importDeclaration(
    useDefault
      ? [t.importDefaultSpecifier(localId)]
      : [t.importNamespaceSpecifier(localId)],
    importString,
  )
  injectImportIntoBody(program, newImport)
  updateReferencesTo(references, localId)
}
