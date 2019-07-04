import { NodePath, types as t } from '@babel/core'
import { ModulePathsToReplace, NamedExportsMap } from '..'
import { Binding } from '@babel/traverse'
import { assignMaps, isModuleExports } from '../helpers'

/**
 * Collects all property assignments to create a map of named exports
 */
const getNamedExportsFromReferencedAssignments = (
  binding: Binding,
): NamedExportsMap => {
  const exportsMap: NamedExportsMap = new Map()
  binding.referencePaths.forEach(refPath => {
    // idk if this will ever be false... but type narrowing
    if (!refPath.isIdentifier()) return
    const memExp = refPath.parentPath
    const assignment = memExp.parentPath
    // find direct member assignments in the top level
    // obj.foo = bar
    if (
      !memExp.isMemberExpression() ||
      !assignment.isAssignmentExpression() ||
      !assignment.parentPath.isExpressionStatement() ||
      !assignment.parentPath.parentPath.isProgram()
    )
      return
    const prop = memExp.get('property') as NodePath
    if (!prop.isIdentifier()) return
    exportsMap.set(prop.node.name, assignment)
  })
  return exportsMap
}

const getNamedExportsFromObject = (
  obj: NodePath<t.ObjectExpression>,
): NamedExportsMap => {
  const exportsMap: NamedExportsMap = new Map()
  obj.get('properties').forEach(prop => {
    if (
      prop.isObjectProperty() &&
      t.isIdentifier(prop.node.key) &&
      prop.get('value').isExpression()
    )
      exportsMap.set(prop.node.key.name, prop)
  })
  return exportsMap
}

interface BaseExportInfo {
  /**
   * - If the value is `'root'`, the assignment is assigning to exports or module.exports
   * - If the value is a `NodePath`, the assignment is assigning to a top-level property on module.exports or exports (i.e. it is a named export)
   * - If the value is `'unknown'`, the assignment assigns to a sub-property on module.exports or something else that is unknown
   */
  assignmentTarget: 'root' | NodePath<t.Identifier> | 'unknown'
}

interface ModuleExportsExportInfo extends BaseExportInfo {
  type: 'module.exports'
  /** Path pointing to the root module.exports object */
  rootPath: NodePath<t.MemberExpression>
}

interface ExportsExportInfo extends BaseExportInfo {
  type: 'exports'
  /** Path pointing to the root exports object */
  rootPath: NodePath<t.Identifier>
}

type ExportInfo = ModuleExportsExportInfo | ExportsExportInfo

const getExportInfo = (path: NodePath): false | ExportInfo => {
  if (path.isIdentifier()) {
    if (path.node.name === 'exports')
      return { assignmentTarget: 'root', type: 'exports', rootPath: path }
  } else if (path.isMemberExpression()) {
    if (isModuleExports(path.node)) {
      return {
        assignmentTarget: 'root',
        rootPath: path,
        type: 'module.exports',
      }
    }
    const obj = path.get('object')
    const prop = path.get('property') as NodePath
    // recurse!
    const objExportInfo = getExportInfo(obj)
    if (!objExportInfo) return false
    if (objExportInfo.assignmentTarget === 'root') {
      // obj is module.exports and this is module.exports.foo
      return {
        ...objExportInfo,
        // if it is an identifier, use it, otherwise, it is unknown
        assignmentTarget: prop.isIdentifier() ? prop : 'unknown',
      }
    }
    if (objExportInfo.assignmentTarget === 'unknown') return objExportInfo
    // assignmentTarget is a `NodePath`
    // obj is module.exports.foo and this is module.exports.foo.bar
    return {
      ...objExportInfo,
      assignmentTarget: 'unknown',
    }
  }
  return false
}

export const handlePotentialExport = (
  path: NodePath<t.AssignmentExpression>,
  modulePathsToReplace: ModulePathsToReplace,
  namedExports: NamedExportsMap,
) => {
  const left = path.get('left')
  const right = path.get('right')
  // eliminate destructuring, nested assignments, etc.
  if (!(left.isIdentifier() || left.isMemberExpression())) return

  const exportInfo = getExportInfo(left)
  // this means that the assignment has no references to module.exports or exports
  if (!exportInfo) return
  // later we will replace references to module.exports with _default (if we don't bail before then)
  modulePathsToReplace.add(exportInfo.rootPath)
  // if it is module.exports.foo.bar = asdf, we don't create a named export from it
  if (exportInfo.assignmentTarget === 'unknown') return
  // if it is module.exports = asdf or exports = asdf
  if (exportInfo.assignmentTarget === 'root') {
    // Assigning `exports = asdf` in node does nothing
    if (exportInfo.type === 'exports') return

    // if we assign to module.exports.foo, and then assign module.exports to something else,
    // then we should clear out module.exports.foo since it no longer exists
    namedExports.clear()

    // if we are assigning: module.exports = asdf, we need to look up asdf and get all its properties as named exports
    if (right.isIdentifier()) {
      const binding = path.scope.getBinding(right.node.name)
      if (!binding) return
      const declaratorPath = binding.path
      if (declaratorPath.isVariableDeclarator()) {
        const init = declaratorPath.get('init')
        // if the referenced variable is an object literal, grab all the properties and make them exports
        if (init.isObjectExpression()) {
          assignMaps(namedExports, getNamedExportsFromObject(init))
        }
      }
      // look up where properties are set on referenced object and use them as named exports
      assignMaps(
        namedExports,
        getNamedExportsFromReferencedAssignments(binding),
      )
    } else if (right.isObjectExpression()) {
      // assignment: module.exports.foo = {asdf: 'asdf'}
      // grab all properties and make them named exports
      assignMaps(namedExports, getNamedExportsFromObject(right))
    }
  } else {
    // assignment: module.exports.foo = blah
    const id = exportInfo.assignmentTarget
    namedExports.set(id.node.name, path)
  }
}
