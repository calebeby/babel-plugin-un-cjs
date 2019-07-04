"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helper_plugin_utils_1 = require("@babel/helper-plugin-utils");
const core_1 = require("@babel/core");
const writeExports_1 = require("./exports/writeExports");
const handleDefaultImport_1 = require("./imports/handleDefaultImport");
const handleNamedImport_1 = require("./imports/handleNamedImport");
const handleWildcardImport_1 = require("./imports/handleWildcardImport");
const helpers_1 = require("./helpers");
const handlePotentialExport_1 = require("./exports/handlePotentialExport");
const handlePotentialObjectDefineProperty_1 = require("./handlePotentialObjectDefineProperty");
exports.default = helper_plugin_utils_1.declare(api => {
    api.assertVersion(7);
    const namedExports = new Map();
    const modulePathsToReplace = new Set();
    let bail = false;
    return {
        visitor: {
            Program: {
                exit(programPath) {
                    if (!bail) {
                        Array.from(helpers_1.pathsToRemove.values()).forEach(p => p.remove());
                        writeExports_1.writeExports(programPath, modulePathsToReplace, namedExports);
                    }
                    else {
                        console.log('bail', programPath.hub.file.opts.filename);
                    }
                    // reset state
                    bail = false;
                    helpers_1.pathsToRemove.clear();
                    namedExports.clear();
                    modulePathsToReplace.clear();
                },
            },
            CallExpression(path) {
                const { node } = path;
                handlePotentialObjectDefineProperty_1.handlePotentialObjectDefineProperty(path);
                if (!core_1.types.isIdentifier(node.callee))
                    return;
                if (node.callee.name.match(/interopRequireDefault/)) {
                    handleDefaultImport_1.handleDefaultImport(path);
                }
                else if (node.callee.name.match(/interopRequireWildcard/)) {
                    handleWildcardImport_1.handleWildcardImport(path);
                }
                else if (node.callee.name === 'require') {
                    handleNamedImport_1.handleNamedImport(path);
                }
            },
            Identifier(path) {
                if (path.node.name === 'exports') {
                    modulePathsToReplace.add(path);
                }
                else if (path.node.name === 'global') {
                    path.replaceWith(core_1.types.identifier('window'));
                }
            },
            AssignmentExpression(path) {
                const { node } = path;
                if (bail)
                    return;
                // We must bail if there is a non-static export
                const isTopLevel = core_1.types.isProgram(path.parentPath.parent) ||
                    helpers_1.everyParent(path, p => 
                    // workaround to allow for: const foo = module.exports = 'asdf'
                    (p.isProgram() ||
                        p.isAssignmentExpression() ||
                        p.isVariableDeclaration() ||
                        p.isVariableDeclarator()) &&
                        p.parentKey !== 'right');
                if (!isTopLevel) {
                    // assignment that is not in the top-level program
                    // we want to see if module.exports or exports is modified
                    // if it is, we bail on all exports modifications in this file
                    if (core_1.types.isIdentifier(node.left)) {
                        if (node.left.name === 'exports')
                            bail = true;
                    }
                    else {
                        // there are cases where this will think that module is getting modified but it actually isn't
                        // for example (module ? obj1 : obj2).exports = 'false' will never modify module.exports
                        // but that is too complicated to handle for now.
                        path.get('left').traverse({
                            Identifier(path) {
                                if (path.node.name === 'module')
                                    bail = true;
                            },
                        });
                    }
                    // regardless of whether we are bailing on exports modifications in the entire file,
                    // we do not need to continue for this assignment because it is not in the top level
                    return;
                }
                handlePotentialExport_1.handlePotentialExport(path, modulePathsToReplace, namedExports);
            },
        },
    };
});
