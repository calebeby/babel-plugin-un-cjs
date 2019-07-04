import { NodePath, types as t } from '@babel/core'
import { ModulePathsToReplace, NamedExportsMap } from '..'
import { findParentProgramChild, generateIdentifier } from '../helpers'

export const writeExports = (
  programPath: NodePath<t.Program>,
  modulePathsToReplace: ModulePathsToReplace,
  namedExports: NamedExportsMap,
) => {
  // create a _default object to use instead of module.exports
  if (modulePathsToReplace.size !== 0) {
    const newId = programPath.scope.generateUidIdentifier('_default')
    const emptyObject = t.objectExpression([])
    const newDeclaration = t.variableDeclaration('let', [
      t.variableDeclarator(newId, emptyObject),
    ])
    const programBody = programPath.get('body')
    if (!programBody[0]) return // program is empty, we don't need to do anything
    const newDeclarationPath = programBody[0].insertBefore(
      newDeclaration,
    )[0] as NodePath<typeof newDeclaration>
    if (!namedExports.get('default'))
      programBody[programBody.length - 1].insertAfter(
        t.exportDefaultDeclaration(newId),
      )
    newDeclarationPath.scope.registerDeclaration(newDeclarationPath)
    modulePathsToReplace.forEach(path => {
      path.replaceWith(newId)
    })
  }

  /**
   * 1. Go through all the exports
   * 2. Add a named export above in the top scope
   * 3. Replace the value with a reference to the named export
   *
   * @example
   * _default.foo = 'bar' // 1
   * export const foo = 'bar'; _default.foo = 'bar' // 2
   * export const foo = 'bar'; _default.foo = foo // 3
   */
  namedExports.forEach((assignment, exportName) => {
    const programChild = findParentProgramChild(assignment)
    const value = assignment.isAssignmentExpression()
      ? assignment.get('right')
      : (assignment as NodePath<t.ObjectProperty>).get('value')

    // if it is `module.exports.foo = asdf`, we can do `export { asdf as foo }`
    if (value.isIdentifier()) {
      programChild.insertBefore(
        t.exportNamedDeclaration(undefined, [
          t.exportSpecifier(value.node, t.identifier(exportName)),
        ]),
      )
    } else {
      const newId = generateIdentifier(programChild.scope, exportName)
      if (!value.isExpression()) return
      // if the export name is available in the global scope, we can do export const foo = 'bar'
      if (newId.name === exportName) {
        const exportDeclaration = t.exportNamedDeclaration(
          t.variableDeclaration('const', [
            t.variableDeclarator(newId, value.node),
          ]),
          [],
        )

        const newPath = programChild.insertBefore(
          exportDeclaration,
        )[0] as NodePath<typeof exportDeclaration>
        newPath.scope.registerDeclaration(newPath)
        value.replaceWith(newId)
      } else {
        // export name is not available in the global scope, so we must do const _foo = ...; export { _foo as foo }
        const varDeclaration = t.variableDeclaration('const', [
          t.variableDeclarator(newId, value.node),
        ])
        const exportDeclaration = t.exportNamedDeclaration(null, [
          t.exportSpecifier(newId, t.identifier(exportName)),
        ])

        const newPath = programChild.insertBefore([
          varDeclaration,
          exportDeclaration,
        ])[1] as NodePath<typeof exportDeclaration>
        newPath.scope.registerDeclaration(newPath)
        value.replaceWith(newId)
      }
    }
  })
}
