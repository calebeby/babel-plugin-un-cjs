"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@babel/core");
var helpers_1 = require("../helpers");
var handleExportNamed_1 = require("./handleExportNamed");
/**
 * Tries to figure out what an object's properties are after all of its assignments
 */
var unwindPropertyAssignments = function (binding) {
    var initializationPath = binding.path;
    var value = new Map();
    if (initializationPath.isVariableDeclarator()) {
        var init = initializationPath.get('init');
        if (init.isObjectExpression()) {
            init.get('properties').forEach(function (prop) {
                if (!prop.isObjectProperty() || !core_1.types.isIdentifier(prop.node.key))
                    return;
                var val = prop.get('value');
                if (!val.isExpression())
                    return;
                value.set(prop.node.key, val);
            });
        }
    }
    binding.referencePaths.forEach(function (refPath) {
        if (!refPath.isIdentifier())
            return;
        var memExp = refPath.parentPath;
        // find direct member assignments
        // obj.foo = bar
        if (!memExp.isMemberExpression())
            return;
        var assignment = memExp.parentPath;
        if (!assignment.isAssignmentExpression() ||
            !assignment.parentPath.isExpressionStatement() ||
            !assignment.parentPath.parentPath.isProgram())
            return;
        var prop = memExp.get('property');
        if (!prop.isIdentifier())
            return;
        value.set(prop.node, assignment.get('right'));
    });
    return Array.from(value.entries());
};
exports.handleExportObject = function (valuePath, outerPath, namedExports) {
    helpers_1.pathsToRemove.add(outerPath);
    // if someone does:
    // exports.foo = 'hi'
    // exports = {asdf: 123}
    // then exports.foo should be removed
    namedExports.clear();
    // we aren't setting namedExports.default here because instead we will find all the properties at the end
    // allows us to support:
    // module.exports = {foo: 'bar'}
    // module.exports.asdf = 'bar'
    // both should be part of the default exported object
    // extract the value to a separate variable
    //   module.exports = () => {}
    // becomes
    //   _default = () => {}
    //   module.exports = _default
    if (!valuePath.isIdentifier()) {
        valuePath.replaceWith(valuePath.scope.generateDeclaredUidIdentifier('default'));
    }
    // coercion because ts doesn't know that valuePath must be an identifier by now
    // we know it must already be an identifier because we replaced it with one
    var defaultIdentifier = valuePath;
    if (valuePath.isIdentifier()) {
        var resolvedBinding_1 = valuePath.scope.getBinding(valuePath.node.name);
        if (!resolvedBinding_1)
            return;
        var unwoundValue = unwindPropertyAssignments(resolvedBinding_1);
        unwoundValue.forEach(function (_a) {
            var propName = _a[0], value = _a[1];
            // change:
            //   const foo = () => {}
            //   foo.asdf = 'asdf'
            //   module.exports = foo
            // to:
            //   const asdf = 'asdf'
            //   const foo = () => {}
            //   foo.asdf = asdf
            //   export default foo
            //   export { asdf }
            var newId = helpers_1.generateIdentifier(value.scope, propName.name);
            var programBody = helpers_1.getProgramBody(value);
            var newPath = programBody.insertBefore(core_1.types.variableDeclaration('const', [
                core_1.types.variableDeclarator(newId, value.node),
            ]))[0];
            programBody.scope.registerDeclaration(newPath);
            value.replaceWith(newId);
            handleExportNamed_1.handleExportNamed(propName, newId, resolvedBinding_1.scope, namedExports);
        });
        handleExportNamed_1.handleExportNamed(core_1.types.identifier('default'), valuePath.node, resolvedBinding_1.scope, namedExports);
    }
    else if (valuePath.isObjectExpression()) {
        // if it is an object loop through the properties and export each one
        valuePath.get('properties').forEach(function (prop) {
            if (prop.isObjectProperty() &&
                core_1.types.isIdentifier(prop.node.key) &&
                core_1.types.isExpression(prop.node.value)) {
                handleExportNamed_1.handleExportNamed(prop.node.key, prop.node.value, valuePath.scope, namedExports);
            }
        });
    }
};
