import { types as t, NodePath } from '@babel/core'
import { getRequirePath, generateIdentifier, getProgramPath } from '../helpers'

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

const injectImportIntoBody = (
  programPath: NodePath<t.Program>,
  newImport: t.ImportDeclaration,
) => {
  const body = programPath.get('body')
  const existingImports = body.filter((p) => p.isImportDeclaration())
  if (existingImports.length === 0) {
    programPath.unshiftContainer('body', newImport)
  } else {
    existingImports[existingImports.length - 1].insertAfter(newImport)
  }
  return programPath.get('body').find((p) => p.node === newImport) as NodePath<
    t.ImportDeclaration
  >
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
      // Then it checks to make sure that the asdf name is available in the root scope
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
      const localId = generateIdentifier(program.scope, originalId)
      const newImport = t.importDeclaration(
        [t.importSpecifier(localId, importedId)],
        importString,
      )
      variableDeclarator.remove()
      const importPath = injectImportIntoBody(program, newImport)
      program.scope.registerDeclaration(importPath)
      const newBinding = program.scope.getBinding(localId.name)
      if (!newBinding) return
      references.forEach((p) => {
        // isReferencedIdentifier will be true for both Identifiers and JSXIdentifiers
        if (!p.isReferencedIdentifier()) return
        p.node.name = localId.name
        // @ts-ignore
        newBinding.reference(p)
      })
      return
    }
    const localId = generateIdentifier(program.scope, importedId)
    const newImport = t.importDeclaration(
      [t.importSpecifier(localId, importedId)],
      importString,
    )
    injectImport(path, newImport)
    memberExp.replaceWith(localId)
    return
  }
  if (
    !parent.isVariableDeclarator() ||
    // variable is not in root scope
    path.scope.getProgramParent() !== path.scope
  ) {
    // Handling cases where require statement is within another expression
    // console.log(require('foo'))
    // Becomes
    // import foo from 'foo'; console.log(foo)
    //
    // Also handling cases where require statement is within variable, but variable is not top-level
    // () => { const foo = require('bar') }
    // Becomes
    // import bar from 'bar'; () => { const foo = bar }

    const id = generateIdentifier(
      path.scope,
      importString.value.replace(/[^a-zA-Z]/g, ''),
    )
    const newImport = t.importDeclaration(
      [t.importDefaultSpecifier(id)],
      importString,
    )
    injectImport(path, newImport)
    path.replaceWith(id)
    return
  }
  const variableDeclarator = parent
  // const foo = require('asdf')
  const originalId = variableDeclarator.get('id')
  if (originalId.isObjectPattern()) {
    // Handling:
    // const { a, foo: bar } = require("....")
    const importSpecifiers: t.ImportSpecifier[] = originalId.node.properties
      .map((prop) => {
        // ignore rest/spread, can't do that
        // Potentially in the future we can handle rest/spread with namespace import
        if (!t.isObjectProperty(prop)) return
        const local = prop.value
        const imported = prop.key
        if (!t.isIdentifier(local)) return
        return t.importSpecifier(local, imported)
      })
      .filter((v): v is t.ImportSpecifier => t.isImportSpecifier(v))
    const newImport = t.importDeclaration(importSpecifiers, importString)
    injectImport(path, newImport)
    path.parentPath.remove()
    return
  }
  if (!originalId.isIdentifier()) return
  const originalIdName = originalId.node.name
  const { scope } = path
  const binding = scope.getBinding(originalIdName)
  if (!binding) return

  // const foo = require('bar')
  // Two possible situations here:
  // 1. Never using foo directly, only properties like foo.bar and foo.baz:
  //    -> import * as foo from 'bar'
  // 2. Uses foo directly, and may additionally use properties (or foo is not used at all, directly or on a sub-property)
  //    -> import foo from 'bar'
  //    To ponder: Should a second import (namespace import) be created for the properties?
  //    How do we know if something is meant to be a property of the default export vs a separate export?

  const useDefault =
    binding.referencePaths.length === 0 ||
    binding.referencePaths.some(
      (referencePath) =>
        // at least one of the references is foo directly instead of a property
        !t.isMemberExpression(referencePath.parent),
    )

  const newImport = t.importDeclaration(
    useDefault
      ? [t.importDefaultSpecifier(originalId.node)]
      : [t.importNamespaceSpecifier(originalId.node)],
    importString,
  )
  path.parentPath.remove()
  injectImport(path, newImport)
}
