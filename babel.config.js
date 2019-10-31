const presets = [
  [
    "@babel/env",
    {
      targets: ["last 2 versions", "ie >= 10"],
      "corejs": "2",
      useBuiltIns: "usage",
    },
  ],
];

module.exports = { presets };
