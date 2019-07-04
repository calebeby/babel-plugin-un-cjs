"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
const helpers_1 = require("../helpers");
exports.writeExports = (programPath, modulePathsToReplace, namedExports) => {
    // create a _default object to use instead of module.exports
    if (modulePathsToReplace.size !== 0) {
        const newId = programPath.scope.generateUidIdentifier('_default');
        const emptyObject = core_1.types.objectExpression([]);
        const newDeclaration = core_1.types.variableDeclaration('let', [
            core_1.types.variableDeclarator(newId, emptyObject),
        ]);
        const programBody = programPath.get('body');
        if (!programBody[0])
            return; // program is empty, we don't need to do anything
        const newDeclarationPath = programBody[0].insertBefore(newDeclaration)[0];
        if (!namedExports.get('default'))
            programBody[programBody.length - 1].insertAfter(core_1.types.exportDefaultDeclaration(newId));
        newDeclarationPath.scope.registerDeclaration(newDeclarationPath);
        modulePathsToReplace.forEach(path => {
            path.replaceWith(newId);
        });
    }
    /**
     * 1. Go through all the exports
     * 2. Add a named export above in the top scope
     * 3. Replace the value with a reference to the named export
     *
     * @example
     * _default.foo = 'bar' // 1
     * export const foo = 'bar'; _default.foo = 'bar' // 2
     * export const foo = 'bar'; _default.foo = foo // 3
     */
    namedExports.forEach((assignment, exportName) => {
        const programChild = helpers_1.findParentProgramChild(assignment);
        const value = assignment.isAssignmentExpression()
            ? assignment.get('right')
            : assignment.get('value');
        // if it is `module.exports.foo = asdf`, we can do `export { asdf as foo }`
        if (value.isIdentifier()) {
            programChild.insertBefore(core_1.types.exportNamedDeclaration(undefined, [
                core_1.types.exportSpecifier(value.node, core_1.types.identifier(exportName)),
            ]));
        }
        else {
            const newId = helpers_1.generateIdentifier(programChild.scope, exportName);
            if (!value.isExpression())
                return;
            // if the export name is available in the global scope, we can do export const foo = 'bar'
            if (newId.name === exportName) {
                const exportDeclaration = core_1.types.exportNamedDeclaration(core_1.types.variableDeclaration('const', [
                    core_1.types.variableDeclarator(newId, value.node),
                ]), []);
                const newPath = programChild.insertBefore(exportDeclaration)[0];
                newPath.scope.registerDeclaration(newPath);
                value.replaceWith(newId);
            }
            else {
                // export name is not available in the global scope, so we must do const _foo = ...; export { _foo as foo }
                const varDeclaration = core_1.types.variableDeclaration('const', [
                    core_1.types.variableDeclarator(newId, value.node),
                ]);
                const exportDeclaration = core_1.types.exportNamedDeclaration(null, [
                    core_1.types.exportSpecifier(newId, core_1.types.identifier(exportName)),
                ]);
                const newPath = programChild.insertBefore([
                    varDeclaration,
                    exportDeclaration,
                ])[1];
                newPath.scope.registerDeclaration(newPath);
                value.replaceWith(newId);
            }
        }
    });
};
