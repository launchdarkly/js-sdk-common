# LaunchDarkly Javascript SDK Core Components

[![Actions Status][ci-badge]][ci]

## LaunchDarkly overview

[LaunchDarkly](https://www.launchdarkly.com) is a feature management platform that serves trillions of feature flags daily to help teams build better software, faster. [Get started](https://docs.launchdarkly.com/home/getting-started) using LaunchDarkly today!

[![Twitter Follow](https://img.shields.io/twitter/follow/launchdarkly.svg?style=social&label=Follow&maxAge=2592000)](https://twitter.com/intent/follow?screen_name=launchdarkly)

## Overview

This project provides core implementation components for all of the LaunchDarkly client-side SDKs that use JavaScript: the JS (browser) SDK, the React SDK, the client-side Node SDK, and the Electron SDK. Application code should never refer to the `launchdarkly-js-sdk-common` package directly.

The `initialize` function in `index.js` creates the basic client object that all of those SDKs are built upon. The SDK's own `initialize` function calls this function, providing a "platform" object that defines additional capabilities specific to that SDK, and then optionally decorates the client object with any other public methods or properties it should have. Inasmuch as possible, the SDK code contains only what is necessary to distinguish it from the other JavaScript-based SDKs. For instance, this project contains no browser-specific code; that is all in [`js-client-sdk`](https://github.com/launchdarkly/js-client-sdk).

It also provides TypeScript definitions in `index.d.ts` which are re-exported or extended by the SDKs, so the Typedoc documentation for the SDKs includes them.

## Contributing

We encourage pull requests and other contributions from the community. Check out our [contributing guidelines](CONTRIBUTING.md) for instructions on how to contribute to this project.

## About LaunchDarkly

* LaunchDarkly is a continuous delivery platform that provides feature flags as a service and allows developers to iterate quickly and safely. We allow you to easily flag your features and manage them from the LaunchDarkly dashboard.  With LaunchDarkly, you can:
    * Roll out a new feature to a subset of your users (like a group of users who opt-in to a beta tester group), gathering feedback and bug reports from real-world use cases.
    * Gradually roll out a feature to an increasing percentage of users, and track the effect that the feature has on key metrics (for instance, how likely is a user to complete a purchase if they have feature A versus feature B?).
    * Turn off a feature that you realize is causing performance problems in production, without needing to re-deploy, or even restart the application with a changed configuration file.
    * Grant access to certain features based on user attributes, like payment plan (eg: users on the ‘gold’ plan get access to more features than users in the ‘silver’ plan). Disable parts of your application to facilitate maintenance, without taking everything offline.
* LaunchDarkly provides feature flag SDKs for a wide variety of languages and technologies. Read [our documentation](https://docs.launchdarkly.com/sdk) for a complete list.
* Explore LaunchDarkly
    * [launchdarkly.com](https://www.launchdarkly.com/ "LaunchDarkly Main Website") for more information
    * [docs.launchdarkly.com](https://docs.launchdarkly.com/  "LaunchDarkly Documentation") for our documentation and SDK reference guides
    * [apidocs.launchdarkly.com](https://apidocs.launchdarkly.com/  "LaunchDarkly API Documentation") for our API documentation
    * [blog.launchdarkly.com](https://blog.launchdarkly.com/  "LaunchDarkly Blog Documentation") for the latest product updates

[ci-badge]: https://github.com/launchdarkly/js-sdk-common/actions/workflows/ci.yml/badge.svg
[ci]: https://github.com/launchdarkly/js-sdk-common/actions/workflows/ci.yml
