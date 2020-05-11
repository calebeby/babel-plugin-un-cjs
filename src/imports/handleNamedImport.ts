import { types as t, NodePath } from '@babel/core'
import { getRequirePath, generateIdentifier, getProgramBody } from '../helpers'

const injectImport = (path: NodePath, newImport: t.ImportDeclaration) => {
  const programBody = getProgramBody(path)
  const newImportPath = programBody.insertBefore([newImport])[0] as NodePath<
    typeof newImport
  >
  programBody.scope.registerDeclaration(newImportPath)
}

export const handleNamedImport = (path: NodePath<t.CallExpression>) => {
  const { node } = path
  const importString = getRequirePath(node)
  if (!importString) return
  if (path.parentPath.isMemberExpression()) {
    // handling require('asdf').foo
    // transforms to import {foo} from 'asdf' and replace expression with foo
    const memberExp = path.parentPath
    if (!t.isIdentifier(memberExp.node.property)) return
    const importId = memberExp.node.property
    if (
      memberExp.parentPath.isVariableDeclarator() &&
      t.isIdentifier(memberExp.parentPath.node.id)
    ) {
      // special case: handling const asdf = require('asdf').foo
      // transforms to import {foo as asdf} from 'asdf'
      // MAKE SURE to _not_ handle const {asdf} = require('asdf').foo
      const newImport = t.importDeclaration(
        [t.importSpecifier(memberExp.parentPath.node.id, importId)],
        importString,
      )
      injectImport(path, newImport)
      memberExp.parentPath.remove()
      return
    }
    const localId = generateIdentifier(
      path.scope.getProgramParent(),
      importId.name,
    )
    const newImport = t.importDeclaration(
      [t.importSpecifier(localId, importId)],
      importString,
    )
    injectImport(path, newImport)
    memberExp.replaceWith(localId)
    return
  }
  const parentPath = path.parentPath
  if (parentPath.isExpressionStatement()) {
    // require('asdf') (side effects import only)
    parentPath.replaceWith(t.importDeclaration([], importString))
    return
  }
  if (!parentPath.isVariableDeclarator()) {
    // handling cases where require statement is within another expression
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
    injectImport(path, newImport)
    path.replaceWith(id)
    return
  }
  const variableDeclarator = parentPath
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

  // if we use foo.bar and foo directly, then we should _just_ import default
  const usesDefaultImport = binding.referencePaths.some((referencePath) => {
    // at least one of the references is foo directly instead of a property
    return !t.isMemberExpression(referencePath.parent)
  })

  // const foo = require('bar')
  // Two possible situations here:
  // 1. Never using foo directly, only properties like foo.bar and foo.baz:
  //    -> import * as foo from 'bar'
  // 2. Uses foo directly, and may additionally use properties
  //    -> import foo from 'bar'
  //    To ponder: Should a second import (namespace import) be created for the properties?
  //    How do we know if something is meant to be a property of the default export vs a separate export?

  const newImport = t.importDeclaration(
    usesDefaultImport
      ? [t.importDefaultSpecifier(originalId.node)]
      : [t.importNamespaceSpecifier(originalId.node)],
    importString,
  )
  path.parentPath.remove()
  injectImport(path, newImport)
}
