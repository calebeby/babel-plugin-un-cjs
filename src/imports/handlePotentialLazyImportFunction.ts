import { types as t, NodePath } from '@babel/core'
import { generateIdentifier } from '../helpers'

export const handlePotentialLazyImportFunction = (
  path: NodePath<t.FunctionDeclaration>,
) => {
  // Handle transforming babel lazy import blocks:
  // function _parser() {
  //   const data = require("@babel/parser");
  //   _parser = function () {
  //     return data;
  //   };
  //   return data;
  // }

  const funcNameId = path.node.id
  if (!funcNameId) return

  const funcName = funcNameId.name

  const binding = path.scope.getBinding(funcName)
  if (!binding) return
  // If the function is referenced in a way that is different from `foo().bar`, then we bail
  const hasInvalidReference = binding.referencePaths.some((ref) => {
    const parent = ref.parentPath!
    if (!parent.isCallExpression()) return true
    const grandparent = parent.parentPath
    if (!grandparent.isMemberExpression()) return true
    if (grandparent.node.object !== parent.node) return true
  })
  if (hasInvalidReference) return

  const statements = path.get('body').get('body')

  if (statements.length !== 3) return

  const [importStatement, funcReplacementStatement, returnStatement] =
    statements

  if (
    !importStatement.isVariableDeclaration() ||
    !funcReplacementStatement.isExpressionStatement() ||
    !returnStatement.isReturnStatement()
  )
    return

  // Checking:
  // const data = require("@babel/parser");
  const declarations = importStatement.get('declarations')
  if (declarations.length !== 1) return
  const firstDeclaration = declarations[0]
  // Identifier for the variable named data in the example above
  const dataId = firstDeclaration.node.id
  if (!t.isIdentifier(dataId)) return
  const dataName = dataId.name
  const dataValue = firstDeclaration.node.init
  if (!dataValue) return

  // Checking:
  // _parser = function () {
  //   return data;
  // };
  const funcReplacementAssignment = funcReplacementStatement.get('expression')
  if (!funcReplacementAssignment.isAssignmentExpression()) return
  const leftSide = funcReplacementAssignment.node.left
  if (!t.isIdentifier(leftSide) || leftSide.name !== funcName) return
  const rightSide = funcReplacementAssignment.node.right
  if (!t.isFunctionExpression(rightSide)) return
  const replacedFuncStatements = rightSide.body.body
  if (replacedFuncStatements.length !== 1) return
  const subReturnStatement = replacedFuncStatements[0]
  if (!t.isReturnStatement(subReturnStatement)) return
  const subReturnVal = subReturnStatement.argument
  if (!t.isIdentifier(subReturnVal) || subReturnVal.name !== dataName) return

  // Checking:
  // return data;

  const returnVal = returnStatement.node.argument
  if (!t.isIdentifier(returnVal) || returnVal.name !== dataName) return

  path.scope.removeBinding(funcName)
  const newId = generateIdentifier(path.scope, funcName)

  // Replace the lazy function with const newId = require("@babel/parser")
  path.replaceWith(
    t.variableDeclaration('const', [t.variableDeclarator(newId, dataValue)]),
  )
  path.scope.registerDeclaration(path)
  const newBinding = path.scope.getBinding(newId.name)
  if (!newBinding) return

  // Replace all instances of _parser().foo with newId.foo
  binding.referencePaths.forEach((ref) => {
    const parent = ref.parentPath!
    if (!parent.isCallExpression()) return
    parent.replaceWith(newId)
    newBinding.reference(parent)
  })
}
