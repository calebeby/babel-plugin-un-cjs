import { NodePath, types as t } from '@babel/core'
import { State } from '..'
import { toString, isModuleExports } from '../helpers'

interface ExportedProperty {
  valuePaths: NodePath<t.Expression>[]
  referencePaths: NodePath<MemberExpression>[]
}

type MemberExpression = t.MemberExpression | t.JSXMemberExpression
type Identifier = t.Identifier | t.JSXIdentifier

export const handleExports = (
  programPath: NodePath<t.Program>,
  state: State,
) => {
  const { referencesToExports } = state
  /** All the paths which are module.exports */
  const moduleExportsPaths: NodePath<MemberExpression>[] = []
  /** All the paths which are `exports` */
  const exportsPaths: NodePath<Identifier>[] = []
  /** All the paths which are `exports = ...` */
  const assignmentsToExports: NodePath<t.AssignmentExpression>[] = []
  /** All the paths which are `module.exports = ...` */
  const assignmentsToModuleExports: NodePath<t.AssignmentExpression>[] = []
  /** All paths which reference the global `exports` object directly, not a property */
  const topExportsReferences: NodePath<Identifier>[] = []
  /** All paths which reference the global `module.exports` object directly, not a property */
  const topModuleExportsReferences: NodePath<Identifier>[] = []

  const exportedProperties = new Map<string, ExportedProperty>()

  // Collect all the references to `module.exports` and `exports` and `module.exports =` and `exports =`
  for (const id of referencesToExports) {
    if (id.node.name === 'exports') {
      exportsPaths.push(id)
      if (id.parentPath.isAssignmentExpression())
        assignmentsToExports.push(id.parentPath)
    } else {
      // Check for module.exports
      const moduleExports = id.parentPath
      if (
        (moduleExports.isMemberExpression() ||
          moduleExports.isJSXMemberExpression()) &&
        isModuleExports(moduleExports.node)
      ) {
        moduleExportsPaths.push(moduleExports)
        if (moduleExports.parentPath.isAssignmentExpression()) {
          assignmentsToModuleExports.push(moduleExports.parentPath)
        }
      }
    }
  }

  // Collect all the exportedProperties
  for (const exportsPath of exportsPaths) {
    // Each exportsPath is a reference to the global `exports` object

    // Check for exports.____
    if (
      exportsPath.parentPath.isMemberExpression() &&
      exportsPath.parentKey === 'object'
    ) {
      const memberExp = exportsPath.parentPath
      const exportedId = memberExp.node.property
      if (!exportedId.isIdentifier) {
      }
      const exportedProerty = exportedProperties.get()
    } else {
      // `console.log(exports)` or `exports =` or anything else references exports without a property
    }
  }
}
