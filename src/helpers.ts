import { NodePath, types as t } from '@babel/core'
import { Scope } from '@babel/traverse'
import generate from '@babel/generator'

// we are storing them here instead of removing them right away in case we bail
// on export modification
export const pathsToRemove = new Set<NodePath>()

/**
 * Given a node, checks to see if it matches require("...")
 * If it does, returns the require path within that expression
 */
export const getRequirePath = (requireStatement: t.Node) => {
  if (
    !t.isCallExpression(requireStatement) ||
    !t.isIdentifier(requireStatement.callee) ||
    requireStatement.callee.name !== 'require' ||
    requireStatement.arguments.length !== 1
  ) {
    return
  }
  const importPathArg = requireStatement.arguments[0]
  if (!t.isStringLiteral(importPathArg)) return
  return importPathArg
}

export const getProgramPath = (path: NodePath<unknown>) =>
  path.find((p) => p.isProgram()) as NodePath<t.Program>

export const getProgramBody = (path: NodePath<unknown>) =>
  getProgramPath(path).get('body.0') as NodePath<t.Node>

const reserved = ['default', 'super', 'import']

export const generateIdentifier = (
  scope: Scope,
  preferredId: string | t.Identifier,
) => {
  const name: string =
    typeof preferredId === 'string' ? preferredId : preferredId.name
  if (scope.hasBinding(name) || reserved.includes(name))
    return scope.generateUidIdentifier(name)
  return typeof preferredId === 'string' ? t.identifier(name) : preferredId
}

/** Object.assign but for maps */
export const assignMaps = <Key, Val>(
  map: Map<Key, Val>,
  ...sources: Map<Key, Val>[]
) => {
  for (const source of sources) {
    const entries = source.entries()
    for (const entry of entries) map.set(...entry)
  }
}

/**
 * From a descendent, go up until you hit a direct child of the program path
 */
export const findParentProgramChild = (path: NodePath) =>
  path.find((p) => p.parentPath!.isProgram())!

export const everyParent = (
  path: NodePath,
  condition: (p: NodePath) => boolean,
): boolean => {
  if (condition(path)) {
    if (path.isProgram()) return true
    return everyParent(path.parentPath!, condition)
  }
  return false
}

/** Returns whether a node is `module.exports` */
export const isModuleExports = (node: t.Node): boolean =>
  t.isMemberExpression(node) &&
  t.isIdentifier(node.object) &&
  node.object.name === 'module' &&
  t.isIdentifier(node.property) &&
  node.property.name === 'exports'

/** Returns whether a node is `exports` */
export const isExports = (node: t.Node): boolean =>
  t.isIdentifier(node) && node.name === 'exports'

/**
 * Returns whether this node and all of its parents are not removed
 * This is needed because path.removed does not reflect ancestor removal
 */
export const isStillInTree = (path: NodePath) =>
  everyParent(path, (p) => !p.removed)

export const injectImportIntoBody = (
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
  const importPath = programPath
    .get('body')
    .find((p) => p.node === newImport) as NodePath<t.ImportDeclaration>
  importPath.scope.registerDeclaration(importPath)
  return importPath
}

export const updateReferencesTo = (
  references: NodePath<t.Node>[],
  newId: t.Identifier,
) => {
  references.forEach((p) => {
    // isReferencedIdentifier will be true for both Identifiers and JSXIdentifiers
    if (!p.isReferencedIdentifier()) return
    p.node.name = newId.name
    p.scope.getBinding(newId.name)?.reference(p)
  })
}

export const isDefaultImportHelper = (name: string) =>
  /interopRequireDefault/.exec(name) || name === '__importDefault'

export const isNamespaceImportHelper = (name: string) =>
  /interopRequireWildcard/.exec(name) || name === '__importStar'

export const isInteropHelper = (name: string) =>
  isDefaultImportHelper(name) ||
  isNamespaceImportHelper(name) ||
  /getRequireWildcardCache/.exec(name) ||
  name === '__createBinding' ||
  name === '__exportStar'

export const importPathNameToIdentifierName = (importString: string) =>
  importString.replace(/[^a-zA-Z]/g, '')

/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#Variables
 */
export const isValidIdentiferName = (name: string) => {
  if (!/[a-zA-Z_$]/.exec(name[0])) return false
  if (!/^[\w$]+$/.exec(name)) return false
  return true
}

export const toString = (input: NodePath | t.Node) => {
  const node = (input as NodePath).node || input
  return generate(node).code
}
