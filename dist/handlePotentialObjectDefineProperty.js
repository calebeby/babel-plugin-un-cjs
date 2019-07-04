"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
const helpers_1 = require("./helpers");
// Remove:
// Object.defineProperty(exports, '__esModule', {
//   value: true
// });
exports.handlePotentialObjectDefineProperty = (path) => {
    const args = path.node.arguments;
    if (!core_1.types.isMemberExpression(path.node.callee) ||
        !core_1.types.isIdentifier(path.node.callee.object) ||
        !core_1.types.isIdentifier(path.node.callee.property) ||
        args.length !== 3)
        return;
    const objArg = args[0];
    if (!((core_1.types.isIdentifier(objArg) && objArg.name === 'exports') ||
        (core_1.types.isMemberExpression(objArg) && helpers_1.isModuleExports(objArg))))
        return;
    const propArg = args[1];
    if (!(core_1.types.isStringLiteral(propArg) && propArg.value === '__esModule'))
        return;
    const optsArg = args[2];
    if (!(core_1.types.isObjectExpression(optsArg) && optsArg.properties.length === 1))
        return;
    const prop = optsArg.properties[0];
    if (!(core_1.types.isObjectProperty(prop) &&
        core_1.types.isIdentifier(prop.key) &&
        prop.key.name === 'value' &&
        core_1.types.isBooleanLiteral(prop.value) &&
        prop.value.value === true))
        return;
    helpers_1.pathsToRemove.add(path);
};
