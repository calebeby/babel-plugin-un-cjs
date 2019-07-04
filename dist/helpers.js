"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
// we are storing them here instead of removing them right away in case we bail
// on export modification
exports.pathsToRemove = new Set();
exports.getRequirePath = (requireStatement) => {
    if (!core_1.types.isCallExpression(requireStatement) ||
        !core_1.types.isIdentifier(requireStatement.callee) ||
        requireStatement.callee.name !== 'require' ||
        requireStatement.arguments.length !== 1) {
        return;
    }
    const importPathArg = requireStatement.arguments[0];
    if (!core_1.types.isStringLiteral(importPathArg))
        return;
    return importPathArg.value;
};
exports.getProgramPath = (path) => path.find(p => p.isProgram());
exports.getProgramBody = (path) => exports.getProgramPath(path).get('body.0');
const reserved = ['default'];
exports.generateIdentifier = (scope, name) => scope.hasBinding(name) || reserved.includes(name)
    ? scope.generateUidIdentifier(name)
    : core_1.types.identifier(name);
/** Object.assign but for maps */
exports.assignMaps = (map, ...sources) => {
    for (let source of sources) {
        const entries = source.entries();
        for (let entry of entries)
            map.set(...entry);
    }
};
/**
 * From a descendent, go up until you hit a direct child of the program path
 */
exports.findParentProgramChild = (path) => path.find(p => p.parentPath.isProgram());
exports.everyParent = (path, condition) => {
    if (condition(path) && path.isProgram())
        return true;
    if (condition(path)) {
        return exports.everyParent(path.parentPath, condition);
    }
    return false;
};
exports.isModuleExports = (node) => core_1.types.isIdentifier(node.object) &&
    node.object.name === 'module' &&
    core_1.types.isIdentifier(node.property) &&
    node.property.name === 'exports';
