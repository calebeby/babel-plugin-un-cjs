"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
const helpers_1 = require("../helpers");
exports.handleWildcardImport = (path) => {
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
    helpers_1.pathsToRemove.add(varPath);
    const varScope = path.scope;
    const globalScope = varScope.getProgramParent();
    // because we are moving the variable to the global scope, it may conflict
    const newId = helpers_1.generateIdentifier(globalScope, parent.id.name);
    varScope.rename(parent.id.name, newId.name);
    const importNodePath = helpers_1.getProgramBody(path).insertBefore([
        core_1.types.importDeclaration([core_1.types.importNamespaceSpecifier(newId)], core_1.types.stringLiteral(importPath)),
    ])[0];
    globalScope.registerDeclaration(importNodePath);
};
