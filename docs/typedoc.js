module.exports = {
  out: '/tmp/project-releaser/project/docs/build/html',
  exclude: [
    '**/node_modules/**',
    'test-types.ts'
  ],
  name: "LaunchDarkly Javascript SDK Core Components (4.0.2)",
  readme: 'none',                // don't add a home page with a copy of README.md
  entryPoints: "/tmp/project-releaser/project/typings.d.ts",
  entryPointStrategy: "expand"
};
