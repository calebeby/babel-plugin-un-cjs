import { NodePath, types as t } from '@babel/core'
import { Scope } from '@babel/traverse'

// we are storing them here instead of removing them right away in case we bail
// on export modification
export const pathsToRemove = new Set<NodePath>()

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
  else {
    return typeof preferredId === 'string' ? t.identifier(name) : preferredId
  }
}

/** Object.assign but for maps */
export const assignMaps = <Key, Val>(
  map: Map<Key, Val>,
  ...sources: Map<Key, Val>[]
) => {
  for (let source of sources) {
    const entries = source.entries()
    for (let entry of entries) map.set(...entry)
  }
}

/**
 * From a descendent, go up until you hit a direct child of the program path
 */
export const findParentProgramChild = (path: NodePath) =>
  path.find((p) => p.parentPath.isProgram())

export const everyParent = (
  path: NodePath,
  condition: (p: NodePath) => boolean,
): boolean => {
  if (condition(path)) {
    if (path.isProgram()) return true
    return everyParent(path.parentPath, condition)
  }
  return false
}

export const isModuleExports = (node: t.MemberExpression): boolean =>
  t.isIdentifier(node.object) &&
  node.object.name === 'module' &&
  t.isIdentifier(node.property) &&
  node.property.name === 'exports'

export const isTopLevel = (path: NodePath) =>
  t.isProgram(path.parentPath.parent) ||
  everyParent(
    path,
    (p) =>
      // workaround to allow for: const foo = module.exports = 'asdf'
      (p.isProgram() ||
        p.isAssignmentExpression() ||
        p.isVariableDeclaration() ||
        p.isVariableDeclarator()) &&
      p.parentKey !== 'right',
  )

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
    p.scope
      .getBinding(newId.name)
      // @ts-expect-error
      ?.reference(p)
  })
}

export const isDefaultImportHelper = (name: string) =>
  name.match(/interopRequireDefault/) || name === '__importDefault'

export const isNamespaceImportHelper = (name: string) =>
  name.match(/interopRequireWildcard/) || name === '__importStar'

export const isImportHelper = (name: string) =>
  isDefaultImportHelper(name) ||
  isNamespaceImportHelper(name) ||
  name.match(/getRequireWildcardCache/)

export const importPathNameToIdentifierName = (importString: string) =>
  importString.replace(/[^a-zA-Z]/g, '')
