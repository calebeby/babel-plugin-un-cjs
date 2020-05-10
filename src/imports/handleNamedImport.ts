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
    // handling const foo = require('asdf').foo
    const memberExp = path.parentPath
    if (!t.isIdentifier(memberExp.node.property)) return
    const importId = memberExp.node.property
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
  if (!parentPath.isVariableDeclarator()) return
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
  let importIds = new Map<string, t.Identifier>()

  // if we use foo.bar and foo directly, then we should _just_ import default
  const usesDefaultImport = binding.referencePaths.some((referencePath) => {
    // at least one of the references is foo directly instead of a property
    return !t.isMemberExpression(referencePath.parent)
  })

  const globalScope = scope.getProgramParent()

  /** New identifier for the top-level object */
  const newDefaultId = generateIdentifier(globalScope, originalIdName)

  if (usesDefaultImport) {
    // rename all instances of foo.bar to _foo.bar foo to _foo
    binding.referencePaths.forEach((referencePath) => {
      // I think this should always be true afaik but just to make sure
      if (
        t.isIdentifier(referencePath.node) &&
        referencePath.node.name === originalIdName
      )
        referencePath.replaceWith(newDefaultId)
    })
  } else {
    // not using foo directly, only properties like foo.bar and foo.baz
    // loop through all the references and generate ids for them
    // we will be importing them as {_bar, _baz}
    // change the references to _bar and _baz
    binding.referencePaths.forEach((referencePath) => {
      const memberExpressionNode = referencePath.parent
      const memberExpressionPath = referencePath.parentPath
      if (!t.isMemberExpression(memberExpressionNode)) return
      const propertyNode = memberExpressionNode.property
      if (!t.isIdentifier(propertyNode)) return
      const propName = propertyNode.name
      const newId =
        importIds.get(propName) || generateIdentifier(globalScope, propName)
      importIds.set(propName, newId)
      memberExpressionPath.replaceWith(newId)
    })
  }

  const newImport = t.importDeclaration(
    usesDefaultImport
      ? [t.importDefaultSpecifier(newDefaultId)]
      : Array.from(importIds.entries()).map(([key, id]) =>
          t.importSpecifier(id, t.identifier(key)),
        ),
    importString,
  )
  path.parentPath.remove()
  injectImport(path, newImport)
}
