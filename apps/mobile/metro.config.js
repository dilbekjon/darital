const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and support symlinks
// In pnpm monorepo, packages are in root node_modules/.pnpm/ and symlinked
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Configure module resolution for monorepo
// Allow hierarchical lookup to find packages in root node_modules (required for pnpm)
// This allows Metro to traverse up to find packages like expo-modules-core
config.resolver.disableHierarchicalLookup = false;

// 3.5. Ensure expo-modules-core is resolved correctly in monorepo
config.resolver.unstable_enablePackageExports = true;

// 4. Add resolver for Node.js core modules (needed for socket.io-client and similar packages)
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs', 'cjs'];

// 5. Configure Metro to handle Node.js modules that socket.io-client might use
// The URL polyfill is loaded in index.js, but we need to provide a resolver for 'url' module
config.resolver.extraNodeModules = {
  url: path.resolve(projectRoot, 'metro-url-shim.js'),
  ...config.resolver.extraNodeModules,
};

module.exports = config;
