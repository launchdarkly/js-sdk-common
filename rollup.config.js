const pkg = require('./package.json');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const replace = require('@rollup/plugin-replace');
const { uglify } = require('rollup-plugin-uglify');
const builtins = require('rollup-plugin-node-builtins');
const filesize = require('rollup-plugin-filesize');

const env = process.env.NODE_ENV || 'development';
const version = process.env.npm_package_version;

const entryPoint = 'src/index.js';

const basePlugins = [
  replace({
    'process.env.NODE_ENV': JSON.stringify(env),
    VERSION: JSON.stringify(version),
  }),
  builtins(),
  resolve({
    mainFields: ['browser', 'module', 'main'],
    preferBuiltins: true,
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
  }),
  filesize(),
];

const webPlugins = env === 'production' ?
  basePlugins.concat(
    uglify()
  ) :
  basePlugins;

const configs = [
  {
    input: entryPoint,
    output: {
      name: 'LDClient-Common',
      file: process.env.NODE_ENV === 'production' ? './dist/ldclient-common.min.js' : './dist/ldclient-common.js',
      format: 'umd',
      sourcemap: true,
    },
    plugins: webPlugins,
  },
  {
    input: entryPoint,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    plugins: basePlugins,
  },
  {
    input: entryPoint,
    output: {
      file: pkg.main,
      format: 'es',
      sourcemap: true,
    },
    plugins: basePlugins,
  },
];

module.exports = configs;
