import { types as t, NodePath, Visitor } from '@babel/core'

// Handle transforming babel export * from "" blocks like this:
// var _waitFor = require("./wait-for");
// Object.keys(_waitFor).forEach(function (key) {
//   if (key === "default" || key === "__esModule") return;
//   if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
//   Object.defineProperty(exports, key, {
//     enumerable: true,
//     get: function () {
//       return _waitFor[key];
//     }
//   });
// });
export const handlePotentialWildcardExport = (
  path: NodePath<t.CallExpression>,
  visitor: Visitor<{}>,
) => {
  // Check for Object.keys()
  const callee = path.node.callee
  if (!t.isMemberExpression(callee)) return
  // Check for Object
  if (!t.isIdentifier(callee.object) || callee.object.name !== 'Object') return
  // Check for .keys
  if (!t.isIdentifier(callee.property) || callee.property.name !== 'keys')
    return

  // Check for Object.keys(...).forEach
  if (!path.parentPath.isMemberExpression()) return
  // Check for Object.keys(...).forEach()
  if (!path.parentPath.parentPath.isCallExpression()) return

  /** Function that loops through sub-exports and exports each one */
  const loop = path.parentPath.parentPath

  if (loop.node.arguments.length !== 1) return
  /** Callback function within looper */
  const loopCallback = loop.get('arguments')[0]

  // Check callback in .forEach()
  if (!loopCallback.isFunctionExpression()) return
  const loopCallbackStatements = loopCallback.node.body.body
  // Sometimes there will be 3 statements, sometimes 2
  // When there are 3 statements, the extra one is a the check against _exportNames
  if (loopCallbackStatements.length === 3) {
    if (!t.isIfStatement(loopCallbackStatements[0])) return
    if (!t.isIfStatement(loopCallbackStatements[1])) return
    if (!t.isExpressionStatement(loopCallbackStatements[2])) return
  } else if (loopCallbackStatements.length === 2) {
    if (!t.isIfStatement(loopCallbackStatements[0])) return
    if (!t.isExpressionStatement(loopCallbackStatements[1])) return
  } else return

  // Check what ____ refers to in Object.keys(____)
  const arg = path.get('arguments')[0]
  if (!arg.isIdentifier()) return

  // Check that the value is defined in `import ____ from ''`
  let definition = arg.scope.getBinding(arg.node.name)
  if (!definition) return
  if (definition.path.isVariableDeclarator()) {
    // it hasn't been transformed into an import yet, do it now
    const init = definition.path.get('init')
    if (!init.isCallExpression()) return
    init.traverse(visitor)
    definition = arg.scope.getBinding(arg.node.name)
    if (!definition) return
  }
  if (!definition.path.isImportDefaultSpecifier()) return
  const importStatement = definition.path.parentPath
  if (!importStatement.isImportDeclaration()) return
  const importSource = importStatement.node.source

  const exportStarStatement = t.exportAllDeclaration(importSource)
  importStatement.replaceWith(exportStarStatement)
  loop.remove()
}
