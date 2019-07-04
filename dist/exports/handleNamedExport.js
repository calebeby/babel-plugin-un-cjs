"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleNamedExport = function (name, valueNode, path, namedExports) {
    path.remove();
    namedExports.set(name.name, valueNode);
};
