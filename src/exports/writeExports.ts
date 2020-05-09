import { NodePath, types as t } from '@babel/core'
import { ModulePathsToReplace, NamedExportsMap, ExportPath } from '..'
import { findParentProgramChild, generateIdentifier } from '../helpers'

/** Retrieves export name and value from an ExportPath */
const getExportedValue = (path: ExportPath): NodePath<t.Expression> | false => {
  // module.exports.foo = 'hi' or exports.foo = 'hi'
  if (path.isAssignmentExpression()) return path.get('right')
  // `foo: 'hi'` in `module.exports = {}`
  if (path.isObjectProperty()) {
    const v = path.get('value')
    return v.isExpression() ? v : false
  }

  // Object.defineProperty(exports, 'foo', {
  //   get: function () {
  //     return foo;
  //   }
  // });
  // TODO: handlePotentialObjectDefineProperty should handle this
  const attributesParam = path.get('arguments')[2]
  if (!attributesParam.isObjectExpression()) return false
  /** The `get` property on the defineProperty config object */
  const getProp = attributesParam
    .get('properties')
    .find(
      (p): p is NodePath<t.ObjectProperty> =>
        p.isObjectProperty() &&
        t.isIdentifier(p.node.key) &&
        p.node.key.name === 'get',
    )

  if (!getProp) return false
  const func = getProp.get('value')
  if (!func.isFunctionExpression()) return false
  const statements = func.get('body').get('body')
  if (statements.length !== 1) return false
  const firstStatement = statements[0]
  if (firstStatement.isReturnStatement()) {
    const v = firstStatement.get('argument')
    if (v.isExpression()) return v
  }

  return false
}

export const writeExports = (
  programPath: NodePath<t.Program>,
  modulePathsToReplace: ModulePathsToReplace,
  namedExports: NamedExportsMap,
) => {
  const modulePathsArray = [...modulePathsToReplace]
  const exportObjectId = programPath.scope.generateUidIdentifier('_default')

  // PLEASE NOTE, DO NOT FORGET:
  // exports = ... DOES NOTHING
  // initially the exports object points to the module.exports object
  // which is why you can assign properties to it
  // but if you assign to the exports object itself,
  // then exports no longer points to the same object as module.exports

  // create a _default object to use instead of module.exports and exports
  if (modulePathsArray.length !== 0) {
    const emptyObject = t.objectExpression([])
    /** Each of these nodes is module.exports = ... */
    const directAssignmentsToExportObject = modulePathsArray
      .map(p => {
        // exports = ... does nothing in node, see the big comment above
        if (p.isIdentifier() && p.node.name === 'exports') return
        const parent = p.parentPath
        if (!parent.isAssignmentExpression()) return
        // make sure module.exports or exports is on the left side of =, not the right side
        if (parent.node.left !== p.node) return
        // Make sure module.exports = ... or exports = ... is at the top-level
        if (
          !parent.parentPath.isExpressionStatement() ||
          !parent.parentPath.parentPath.isProgram()
        )
          return
        return parent
      })
      .filter((e): e is NodePath<t.AssignmentExpression> => e !== undefined)

    const newDeclaration = t.variableDeclaration('let', [
      t.variableDeclarator(
        exportObjectId,
        // If there is just one assignment of module.exports = ... or exports = ...
        // initialize _default to that assignment
        // THERE IS A BUG HERE:
        // module.exports.foo = 'hi'
        // module.exports = {}
        // Should result in just the default export of the empty object
        // But this results in an assignment of _default.foo = 'hi' _before_ _default exists
        directAssignmentsToExportObject.length === 1
          ? directAssignmentsToExportObject[0].node.right
          : emptyObject,
      ),
    ])

    const programBody = programPath.get('body')
    if (!programBody[0]) return // program is empty, we don't need to do anything
    let newDeclarationPath: NodePath<t.Statement>
    if (directAssignmentsToExportObject.length === 1) {
      const moduleExportsAssignment = directAssignmentsToExportObject[0]
      const expressionStatement = moduleExportsAssignment.parentPath
      if (!expressionStatement.isExpressionStatement())
        throw new Error(
          'this should not happen, should be expression statement',
        )
      expressionStatement.replaceWith(newDeclaration)
      // This is not actually an expressionStatement anymore, now it is a variableDeclaration
      newDeclarationPath = expressionStatement
    } else {
      newDeclarationPath = programBody[0].insertBefore(
        newDeclaration,
      )[0] as NodePath<typeof newDeclaration>
    }
    if (!namedExports.get('default'))
      // Add export default _default at the bottom
      programBody[programBody.length - 1].insertAfter(
        t.exportDefaultDeclaration(exportObjectId),
      )
    newDeclarationPath.scope.registerDeclaration(newDeclarationPath)
    modulePathsArray.forEach(path => {
      path.replaceWith(exportObjectId)
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
    const value = getExportedValue(assignment)

    if (!value) return

    if (assignment.isCallExpression()) {
      assignment.replaceWith(
        t.assignmentExpression(
          '=',
          t.memberExpression(exportObjectId, t.identifier(exportName)),
          value.node,
        ),
      )
    }

    if (value.isIdentifier()) {
      // if it is `module.exports.foo = asdf`, we can do `export { asdf as foo }`
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
