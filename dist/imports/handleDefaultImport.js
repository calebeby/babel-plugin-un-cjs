"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
const helpers_1 = require("../helpers");
exports.handleDefaultImport = (path) => {
    const { node } = path;
    if (node.arguments.length !== 1)
        return;
    const requireStatement = node.arguments[0];
    const importPath = helpers_1.getRequirePath(requireStatement);
    if (!importPath)
        return;
    const { parent, parentPath: varPath } = path;
    if (!core_1.types.isVariableDeclarator(parent) || !core_1.types.isIdentifier(parent.id))
        return;
    const varName = parent.id.name;
    const binding = path.scope.getBinding(varName);
    if (!binding)
        return;
    const programPath = helpers_1.getProgramPath(path);
    const globalScope = path.scope.getProgramParent();
    const newImportId = helpers_1.generateIdentifier(globalScope, varName);
    const newImport = core_1.types.importDeclaration([core_1.types.importDefaultSpecifier(newImportId)], core_1.types.stringLiteral(importPath));
    const newPath = helpers_1.getProgramBody(programPath).insertBefore([newImport])[0];
    helpers_1.pathsToRemove.add(varPath);
    // replace all references foo.default with reference to `import`ed
    binding.referencePaths.forEach(referencePath => {
        const { parent, parentPath } = referencePath;
        if (!core_1.types.isMemberExpression(parent)) {
            // if it isn't foo.default (for example if it was generated with babel lazy modules)
            // then we want it to return {default: foo}
            referencePath.replaceWith(core_1.types.objectExpression([
                core_1.types.objectProperty(core_1.types.identifier('default'), newImportId),
            ]));
            return;
        }
        const { property } = parent;
        if (!core_1.types.isIdentifier(property) || property.name !== 'default')
            return;
        parentPath.replaceWith(newImportId);
    });
    globalScope.registerDeclaration(newPath);
};
