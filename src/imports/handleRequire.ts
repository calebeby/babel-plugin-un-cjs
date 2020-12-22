import { types as t, NodePath } from '@babel/core'
import {
  getRequirePath,
  generateIdentifier,
  getProgramPath,
  injectImportIntoBody,
  updateReferencesTo,
  importPathNameToIdentifierName,
  isModuleExports,
} from '../helpers'

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
      injectImportIntoBody(program, newImport)
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
    injectImportIntoBody(program, newImport)
    memberExp.replaceWith(localId)
    return
  }
  if (!parent.isVariableDeclarator()) {
    hoistInlineRequireDefault(path, importString)
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
      if (!t.isObjectProperty(prop)) {
        // Bail on transforming the destructure
        // const { a, b, ...c } = require('hi')
        hoistInlineRequireDefault(path, importString)
        return
      }
      const originalLocalId = prop.value
      const importedId = prop.key
      if (!t.isIdentifier(originalLocalId) || !t.isIdentifier(importedId)) {
        // Bail on transforming the destructure
        // Two examples of how this would happen:
        // const { 'foo-bar': a } = require('hi')
        // const { [foo]: a } = require('hi')
        hoistInlineRequireDefault(path, importString)
        return
      }
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
  if (!t.isIdentifier(originalId)) {
    hoistInlineRequireDefault(path, importString)
    return
  }

  // const foo = require('bar')
  // Four possible situations here:
  // 1. Never using foo directly, only properties like foo.bar and foo.baz:
  //    -> import * as foo from 'bar'
  // 2. Uses foo directly, and may additionally use properties (or foo is not used at all, directly or on a sub-property)
  //    -> import foo from 'bar'
  //    To ponder: Should a second import (namespace import) be created for the properties?
  //    How do we know if something is meant to be a property of the default export vs a separate export?
  // 3. Every place where foo is used is foo.default. This is the output of babel transform commonjs with noInterop: true
  //    -> import foo from 'bar', and change all references from foo.default to foo
  // 4. It is only used as module.exports: const foo = require('./foo'); module.exports = foo
  //    Example in real life: https://github.com/testing-library/jest-dom/blob/v5.11.6/matchers.js
  //    -> export * from 'foo'

  const originalBinding = path.scope.getBinding(originalId.name)
  if (!originalBinding) return
  const references = originalBinding.referencePaths
  path.scope.removeBinding(originalId.name)
  const localId = generateIdentifier(path.scope, originalId)
  path.parentPath.remove()

  // Special case: check for if the only reference is module.exports = imported
  if (references.length === 1) {
    const ref = references[0]
    const assignment = ref.parentPath
    if (
      assignment.isAssignmentExpression() &&
      isModuleExports(assignment.node.left)
    ) {
      assignment.insertBefore(t.exportAllDeclaration(importString))
    }
  }

  const usesDefaultOnly = references.every((ref) => {
    const memberExp = ref.parent
    return (
      t.isMemberExpression(memberExp) &&
      t.isIdentifier(memberExp.property) &&
      memberExp.property.name === 'default'
    )
  })

  const useDefault =
    usesDefaultOnly ||
    references.some(
      (ref) =>
        // at least one of the references is foo directly instead of a property
        !t.isMemberExpression(ref.parent),
    )

  const newImport = t.importDeclaration(
    useDefault
      ? [t.importDefaultSpecifier(localId)]
      : [t.importNamespaceSpecifier(localId)],
    importString,
  )
  injectImportIntoBody(program, newImport)
  if (usesDefaultOnly) {
    references.forEach((ref) => {
      const memberExp = ref.parentPath
      memberExp.replaceWith(localId)
    })
  } else {
    updateReferencesTo(references, localId)
  }
}

/**
 * Hoists an inline require up to an import and replaces where the variable was with the auto-generated variable name
 * @example
 * console.log(require('hi'))
 * // transforms to:
 * import hi from 'hi'
 * console.log(hi)
 *
 * @param path Require call
 */
const hoistInlineRequireDefault = (
  path: NodePath<t.CallExpression>,
  importString: t.StringLiteral,
) => {
  // Handling cases where require statement is within another expression
  // console.log(require('foo'))
  // Becomes
  // import foo from 'foo'; console.log(foo)

  const id = generateIdentifier(
    path.scope,
    importPathNameToIdentifierName(importString.value),
  )
  const newImport = t.importDeclaration(
    [t.importDefaultSpecifier(id)],
    importString,
  )
  injectImportIntoBody(getProgramPath(path), newImport)
  path.replaceWith(id)
}
