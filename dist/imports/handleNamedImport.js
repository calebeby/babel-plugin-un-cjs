"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
const helpers_1 = require("../helpers");
const injectImport = (path, newImport) => {
    const programBody = helpers_1.getProgramBody(path);
    const newImportPath = programBody.insertBefore([newImport])[0];
    programBody.scope.registerDeclaration(newImportPath);
};
exports.handleNamedImport = (path) => {
    const { node } = path;
    const importPath = helpers_1.getRequirePath(node);
    if (!importPath)
        return;
    const importString = core_1.types.stringLiteral(importPath);
    if (path.parentPath.isMemberExpression()) {
        // handling const foo = require('asdf').foo
        const memberExp = path.parentPath;
        if (!core_1.types.isIdentifier(memberExp.node.property))
            return;
        const importId = memberExp.node.property;
        const localId = helpers_1.generateIdentifier(path.scope.getProgramParent(), importId.name);
        const newImport = core_1.types.importDeclaration([core_1.types.importSpecifier(localId, importId)], importString);
        injectImport(path, newImport);
        memberExp.replaceWith(localId);
        return;
    }
    const parentPath = path.parentPath;
    if (parentPath.isExpressionStatement()) {
        // require('asdf') (side effects import only)
        parentPath.replaceWith(core_1.types.importDeclaration([], importString));
        return;
    }
    if (!parentPath.isVariableDeclarator())
        return;
    // const foo = require('asdf')
    const originalId = parentPath.node.id;
    if (!core_1.types.isIdentifier(originalId))
        return;
    const { scope } = path;
    const binding = scope.getBinding(originalId.name);
    if (!binding)
        return;
    let importIds = new Map();
    // if we use foo.bar and foo directly, then we should _just_ import default
    const usesDefaultImport = binding.referencePaths.some(referencePath => {
        // at least one of the references is foo directly instead of a property
        return !core_1.types.isMemberExpression(referencePath.parent);
    });
    const globalScope = scope.getProgramParent();
    /** New identifier for the top-level object */
    const newDefaultId = helpers_1.generateIdentifier(globalScope, originalId.name);
    if (usesDefaultImport) {
        // rename all instances of foo.bar and foo to _foo.bar and _foo
        binding.referencePaths.forEach(referencePath => {
            // I think this should always be true afaik but just to make sure
            if (core_1.types.isIdentifier(referencePath.node) &&
                referencePath.node.name === originalId.name)
                referencePath.replaceWith(newDefaultId);
        });
    }
    else {
        // not using foo directly, only properties like foo.bar and foo.baz
        // loop through all the references and generate ids for them
        // we will be importing them as {_bar, _baz}
        // change the references to _bar and _baz
        binding.referencePaths.forEach(referencePath => {
            const memberExpressionNode = referencePath.parent;
            const memberExpressionPath = referencePath.parentPath;
            if (!core_1.types.isMemberExpression(memberExpressionNode))
                return;
            const propertyNode = memberExpressionNode.property;
            if (!core_1.types.isIdentifier(propertyNode))
                return;
            const propName = propertyNode.name;
            const newId = importIds.get(propName) || helpers_1.generateIdentifier(globalScope, propName);
            importIds.set(propName, newId);
            memberExpressionPath.replaceWith(newId);
        });
    }
    const newImport = core_1.types.importDeclaration(usesDefaultImport
        ? [core_1.types.importDefaultSpecifier(newDefaultId)]
        : Array.from(importIds.entries()).map(([key, id]) => core_1.types.importSpecifier(id, core_1.types.identifier(key))), importString);
    injectImport(path, newImport);
    path.parentPath.remove();
};
