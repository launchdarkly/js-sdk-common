# Contributing to This Project

The `launchdarkly-js-sdk-common` package provides core implementation components for several LaunchDarkly SDKs. Bug reports and feature requests, unless they are very specifically related to a piece of code in this project, should be filed in the specific SDK projects instead.

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

## Releases

LaunchDarkly developers releasing this project should consult the internal documentation on SDK releases. The project does not contain its own release scripts.
