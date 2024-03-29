import { NodePath, types as t } from '@babel/core'
import { ModulePathsToReplace, NamedExportsMap } from '..'
import { Binding } from '@babel/traverse'
import {
  assignMaps,
  isModuleExports,
  isValidIdentiferName,
  getRequirePath,
} from '../helpers'

/**
 * Collects all property assignments to create a map of named exports
 */
const getNamedExportsFromReferencedAssignments = (
  binding: Binding,
): NamedExportsMap => {
  const exportsMap: NamedExportsMap = new Map()
  binding.referencePaths.forEach((refPath) => {
    // idk if this will ever be false... but type narrowing
    if (!refPath.isIdentifier()) return
    const memExp = refPath.parentPath
    const assignment = memExp.parentPath!
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
  obj.get('properties').forEach((prop) => {
    if (!prop.isObjectProperty() || !prop.get('value').isExpression()) return
    const name = t.isIdentifier(prop.node.key)
      ? prop.node.key.name
      : t.isStringLiteral(prop.node.key)
      ? prop.node.key.value
      : undefined
    if (!name) return
    if (!isValidIdentiferName(name)) return
    exportsMap.set(name, prop)
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
        assignmentTarget:
          prop.isIdentifier() && !path.node.computed ? prop : 'unknown',
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

export const handleAssignmentExpression = (
  path: NodePath<t.AssignmentExpression>,
  modulePathsToReplace: ModulePathsToReplace,
  namedExports: NamedExportsMap,
) => {
  const left = path.get('left')
  const right = path.get('right')
  // eliminate destructuring, etc.
  if (!(left.isIdentifier() || left.isMemberExpression())) return

  // handle module.exports = exports.default (needs to be removed, it is itself a CJS-ESM shim)
  // generated by https://github.com/59naga/babel-plugin-add-module-exports - breaks stuff
  if (
    left.isMemberExpression() &&
    isModuleExports(left.node) &&
    right.isMemberExpression() &&
    t.isIdentifier(right.node.object) &&
    right.node.object.name === 'exports' &&
    t.isIdentifier(right.node.property) &&
    right.node.property.name === 'default'
  )
    return path.remove()

  // handle module.exports.default = exports.default (needs to be removed)
  // Also generated by https://github.com/59naga/babel-plugin-add-module-exports, with addDefaultProperty: true
  if (
    left.isMemberExpression() &&
    t.isMemberExpression(left.node.object) &&
    isModuleExports(left.node.object) &&
    t.isIdentifier(left.node.property) &&
    left.node.property.name === 'default' &&
    right.isMemberExpression() &&
    t.isIdentifier(right.node.object) &&
    right.node.object.name === 'exports' &&
    t.isIdentifier(right.node.property) &&
    right.node.property.name === 'default'
  )
    return path.remove()

  // Remove exports.__esModule = true
  // Generated by babel commonjs with loose: true
  if (
    left.isMemberExpression() &&
    right.isBooleanLiteral() &&
    t.isIdentifier(left.node.object, { name: 'exports' }) &&
    t.isIdentifier(left.node.property, { name: '__esModule' }) &&
    right.node.value
  )
    return path.remove()

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
        } else {
          namedExports.set('default', path)
        }
      } else {
        namedExports.set('default', path)
      }
      // look up where properties are set on referenced object and use them as named exports
      assignMaps(
        namedExports,
        getNamedExportsFromReferencedAssignments(binding),
      )
    } else if (right.isObjectExpression()) {
      // assignment: module.exports = {asdf: 'asdf'}
      // grab all properties and make them named exports
      assignMaps(namedExports, getNamedExportsFromObject(right))
    } else {
      // check for module.exports = require('asdf')
      const requirePath = getRequirePath(right.node)
      if (requirePath) {
        path.insertAfter(t.exportAllDeclaration(requirePath))
        path.remove()
        return
      }

      // assigning module.exports = ...
      // and the right side is not an identifier or an object or a require
      namedExports.set('default', path)
    }
  } else {
    // assignment: module.exports.foo = blah
    // or: exports.foo = blah
    const exportName: string = exportInfo.assignmentTarget.node.name
    // Check if there is already a module.exports.foo by the same name
    const existingExport = namedExports.get(exportName)

    // If the already-existing assignment is known to execute before this one
    // We will determine if it can be removed
    if (
      existingExport?.isAssignmentExpression() &&
      !path.willIMaybeExecuteBefore(existingExport) &&
      evaluatesToUndefined(existingExport.node.right)
    ) {
      if (existingExport.parentPath.isExpressionStatement()) {
        // It is safe to remove it altogether
        existingExport.parentPath.remove()
      } else {
        // replace the assignment with just the RHS, since the RHS may have side effects
        existingExport.replaceWith(existingExport.get('right'))
      }
    }
    namedExports.set(exportName, path)
  }
}

/**
 * Determines if a node will definitely evaluate to undefined.
 * Only supports a limited number of use cases, otherwise returns false
 */
const evaluatesToUndefined = (node: t.Node): boolean => {
  if (t.isIdentifier(node) && node.name === 'undefined') {
    return true
  } else if (t.isUnaryExpression(node) && node.operator === 'void') {
    return true
  } else if (t.isAssignmentExpression(node)) {
    return evaluatesToUndefined(node.right)
  }
  return false
}
