import { NodePath, types as t } from '@babel/core'
import { State } from '..'

/**
 * Whenever an Identifier or JSXIdentifier is visited
 * If it is a reference or assignment to exports or module.exports,
 * Add it to state
 */
export const handleIdentifier = (
  path: NodePath<t.JSXIdentifier | t.Identifier>,
  state: State,
) => {
  if (path.node.name !== 'exports' && path.node.name !== 'module') return
  if (!isGlobalVariableName(path)) return
  state.referencesToExports.push(path)
}

/** Returns whether an identifier points to a variable binding that does not exist */
export const isGlobalVariableName = (
  path: NodePath<t.JSXIdentifier | t.Identifier>,
): boolean => {
  // If it is: NODE = foo, then NODE _does_ reference a global variable if there is no binding for it
  // This does not include let NODE = foo, since that creates a new variable
  if (path.parentPath.isAssignmentExpression() && path.parentKey === 'left') {
    return !path.scope.hasBinding(path.node.name)
  }
  // This does not sound like what it is
  // It checks that the identifier is used in a place where it would reference a variable
  // For example, it would return true for: NODE.bar but not for bar.NODE
  // More examples: https://github.com/babel/babel/blob/v7.9.6/packages/babel-types/src/validators/isReferenced.js
  if (!path.isReferencedIdentifier()) return false
  // If there is already a binding for the name, then that means it is not a global
  return !path.scope.hasBinding(path.node.name)
}
