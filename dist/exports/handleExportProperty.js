"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var helpers_1 = require("../helpers");
exports.handleExportNamed = function (property, value, scope, namedExports, assignmentPath) {
    if (assignmentPath)
        helpers_1.exportRelatedPathsToRemove.add(assignmentPath);
    namedExports.set(property.name, value);
};
