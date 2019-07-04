"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@babel/core");
var helpers_1 = require("../helpers");
exports.handleExportNamed = function (property, value, scope, namedExports, assignmentPath) {
    if (assignmentPath)
        helpers_1.pathsToRemove.add(assignmentPath);
    var newId = helpers_1.generateIdentifier(scope, property.name);
    var requirePath = helpers_1.getRequirePath(value);
    if (requirePath) {
        var newImport = core_1.types.importDeclaration([core_1.types.importDefaultSpecifier(newId)], core_1.types.stringLiteral(requirePath));
        var newPath = helpers_1.getProgramBody(scope.path).insertBefore(newImport)[0];
        scope.registerDeclaration(newPath);
        namedExports.set(property.name, newId);
    }
    else if (core_1.types.isIdentifier(value)) {
        namedExports.set(property.name, value);
    }
    else {
        var newDecl = core_1.types.variableDeclaration('const', [
            core_1.types.variableDeclarator(newId, value),
        ]);
        var bodyEls = helpers_1.getProgramPath(scope.path).get('body');
        var newPath = bodyEls[bodyEls.length - 1].insertAfter(newDecl)[0];
        scope.registerDeclaration(newPath);
        namedExports.set(property.name, newId);
    }
};
