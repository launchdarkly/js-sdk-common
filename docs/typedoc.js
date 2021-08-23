module.exports = {
  out: './docs/build/html',
  exclude: [
    '**/node_modules/**',
    'test-types.ts'
  ],
  name: "LaunchDarkly Javascript SDK Core Components (3.3.3)",
  readme: 'none',                // don't add a home page with a copy of README.md
  mode: 'file',                  // don't treat "index.d.ts" itself as a parent module
  includeDeclarations: true,     // allows it to process a .d.ts file instead of actual TS code
  entryPoint: '"launchdarkly-js-sdk-common"'  // note extra quotes - workaround for a TypeDoc bug
};
