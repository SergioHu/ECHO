// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude expo-mcp from Metro's file watcher (fixes Windows permission issue)
config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
};
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /node_modules[\/\\]\.bin[\/\\]expo-mcp/,
];

// Fix for @supabase/supabase-js module resolution issues
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Ensure proper resolution of Supabase packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Handle @supabase packages that have issues with Metro
    if (moduleName.startsWith('@supabase/')) {
        // Try to resolve using the default resolver
        try {
            return context.resolveRequest(context, moduleName, platform);
        } catch (e) {
            // If resolution fails, try with .js extension explicitly
            const parts = moduleName.split('/');
            if (parts.length === 2) {
                const newModuleName = `${moduleName}/dist/main/index.js`;
                try {
                    return context.resolveRequest(context, newModuleName, platform);
                } catch (e2) {
                    // Fall through to default resolution
                }
            }
        }
    }
    
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

