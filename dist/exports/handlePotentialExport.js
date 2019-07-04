"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
const helpers_1 = require("../helpers");
/**
 * Collects all property assignments to create a map of named exports
 */
const getNamedExportsFromReferencedAssignments = (binding) => {
    const exportsMap = new Map();
    binding.referencePaths.forEach(refPath => {
        // idk if this will ever be false... but type narrowing
        if (!refPath.isIdentifier())
            return;
        const memExp = refPath.parentPath;
        const assignment = memExp.parentPath;
        // find direct member assignments in the top level
        // obj.foo = bar
        if (!memExp.isMemberExpression() ||
            !assignment.isAssignmentExpression() ||
            !assignment.parentPath.isExpressionStatement() ||
            !assignment.parentPath.parentPath.isProgram())
            return;
        const prop = memExp.get('property');
        if (!prop.isIdentifier())
            return;
        exportsMap.set(prop.node.name, assignment);
    });
    return exportsMap;
};
const getNamedExportsFromObject = (obj) => {
    const exportsMap = new Map();
    obj.get('properties').forEach(prop => {
        if (prop.isObjectProperty() &&
            core_1.types.isIdentifier(prop.node.key) &&
            prop.get('value').isExpression())
            exportsMap.set(prop.node.key.name, prop);
    });
    return exportsMap;
};
const getExportInfo = (path) => {
    if (path.isIdentifier()) {
        if (path.node.name === 'exports')
            return { assignmentTarget: 'root', type: 'exports', rootPath: path };
    }
    else if (path.isMemberExpression()) {
        if (helpers_1.isModuleExports(path.node)) {
            return {
                assignmentTarget: 'root',
                rootPath: path,
                type: 'module.exports',
            };
        }
        const obj = path.get('object');
        const prop = path.get('property');
        // recurse!
        const objExportInfo = getExportInfo(obj);
        if (!objExportInfo)
            return false;
        if (objExportInfo.assignmentTarget === 'root') {
            // obj is module.exports and this is module.exports.foo
            return {
                ...objExportInfo,
                // if it is an identifier, use it, otherwise, it is unknown
                assignmentTarget: prop.isIdentifier() ? prop : 'unknown',
            };
        }
        if (objExportInfo.assignmentTarget === 'unknown')
            return objExportInfo;
        // assignmentTarget is a `NodePath`
        // obj is module.exports.foo and this is module.exports.foo.bar
        return {
            ...objExportInfo,
            assignmentTarget: 'unknown',
        };
    }
    return false;
};
exports.handlePotentialExport = (path, modulePathsToReplace, namedExports) => {
    const left = path.get('left');
    const right = path.get('right');
    // eliminate destructuring, nested assignments, etc.
    if (!(left.isIdentifier() || left.isMemberExpression()))
        return;
    const exportInfo = getExportInfo(left);
    // this means that the assignment has no references to module.exports or exports
    if (!exportInfo)
        return;
    // later we will replace references to module.exports with _default (if we don't bail before then)
    modulePathsToReplace.add(exportInfo.rootPath);
    // if it is module.exports.foo.bar = asdf, we don't create a named export from it
    if (exportInfo.assignmentTarget === 'unknown')
        return;
    // if it is module.exports = asdf or exports = asdf
    if (exportInfo.assignmentTarget === 'root') {
        // Assigning `exports = asdf` in node does nothing
        if (exportInfo.type === 'exports')
            return;
        // if we assign to module.exports.foo, and then assign module.exports to something else,
        // then we should clear out module.exports.foo since it no longer exists
        namedExports.clear();
        // if we are assigning: module.exports = asdf, we need to look up asdf and get all its properties as named exports
        if (right.isIdentifier()) {
            const binding = path.scope.getBinding(right.node.name);
            if (!binding)
                return;
            const declaratorPath = binding.path;
            if (declaratorPath.isVariableDeclarator()) {
                const init = declaratorPath.get('init');
                // if the referenced variable is an object literal, grab all the properties and make them exports
                if (init.isObjectExpression()) {
                    helpers_1.assignMaps(namedExports, getNamedExportsFromObject(init));
                }
            }
            // look up where properties are set on referenced object and use them as named exports
            helpers_1.assignMaps(namedExports, getNamedExportsFromReferencedAssignments(binding));
        }
        else if (right.isObjectExpression()) {
            // assignment: module.exports.foo = {asdf: 'asdf'}
            // grab all properties and make them named exports
            helpers_1.assignMaps(namedExports, getNamedExportsFromObject(right));
        }
    }
    else {
        // assignment: module.exports.foo = blah
        const id = exportInfo.assignmentTarget;
        namedExports.set(id.node.name, path);
    }
};
