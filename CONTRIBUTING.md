# Contributing to This Project

The `launchdarkly-js-sdk-common` package provides core implementation components for several LaunchDarkly SDKs.

## Submitting bug reports and feature requests

Bug reports and feature requests, unless they are very specifically related to a piece of code in this project, should be filed in the individual SDK repositories instead. If you do have an issue specifically for this repository, the LaunchDarkly SDK team monitors the [issue tracker](https://github.com/launchdarkly/js-sdk-common/issues) and will respond to all newly filed issues within two business days.

## Submitting pull requests

We encourage pull requests and other contributions from the community. Before submitting pull requests, ensure that all temporary or unintended code is removed. Don't worry about adding reviewers to the pull request; the LaunchDarkly SDK team will add themselves. The SDK team will acknowledge all pull requests within two business days.

## Build instructions

### Prerequisites

The project uses `npm`, which is bundled in all supported versions of Node.

### Setup

To install project dependencies, from the project root directory:

```
npm install
```

### Testing

To run all unit tests:

```
npm test
```

To verify that the TypeScript declarations compile correctly (this involves compiling the file `test-types.ts`, so if you have changed any types or interfaces, you will want to update that code):

```
npm run check-typescript
```

### Coding guidelines

This code is shared between several SDK projects: `js-client-sdk` which runs in browsers, `node-client-sdk` which runs in Node.js, and `electron-client-sdk` which uses it both in a Node environment and in a browser environment.

Therefore, it should not have any JavaScript usages that work _only_ in a browser or _only_ in Node.js. All such things, if they depend on the runtime environment, must be accessed indirectly via the "platform" abstraction, where each SDK provides its own platform-specific callbacks for the `js-sdk-common` code to use. Or, if it's just a question of JavaScript syntax usages, use whatever will work in both browsers and Node (for instance, use only `require` and `module.exports`, not ES6 imports).
