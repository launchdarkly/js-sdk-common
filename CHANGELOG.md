# Change log

All notable changes to the `launchdarkly-js-sdk-common` package will be documented in this file. Changes that affect the dependent SDKs such as `launchdarkly-js-client-sdk` should also be logged in those projects, in the next release that uses the updated version of this package. This project adheres to [Semantic Versioning](http://semver.org).

## [5.4.0](https://github.com/launchdarkly/js-sdk-common/compare/5.3.0...5.4.0) (2024-10-18)


### Features

* Add support for client-side prerequisite events. ([#112](https://github.com/launchdarkly/js-sdk-common/issues/112)) ([9d1708b](https://github.com/launchdarkly/js-sdk-common/commit/9d1708b212246c5650794af99f79cd6a95cfbcd1))

## [5.3.0](https://github.com/launchdarkly/js-sdk-common/compare/launchdarkly-js-sdk-common-v5.2.0...launchdarkly-js-sdk-common-v5.3.0) (2024-06-18)


### Features

* Add inExperiment to evaluation reason. ([#105](https://github.com/launchdarkly/js-sdk-common/issues/105)) ([cf69770](https://github.com/launchdarkly/js-sdk-common/commit/cf6977080e67e4e54f773df410a671764dbcb304))
* Allow for synchronous inspectors. ([#103](https://github.com/launchdarkly/js-sdk-common/issues/103)) ([7e490f4](https://github.com/launchdarkly/js-sdk-common/commit/7e490f479299f772a9db78efd1c2235645785250))

## [5.2.0] - 2024-05-01
### Added:
- Added an optional timeout to the `waitForInitialization` method. When a timeout is specified the returned promise will be rejected after the timeout elapses if the client has not finished initializing within that time. When no timeout is specified the returned promise will not be resolved or rejected until the initialization either completes or fails.

### Changed:
- The track method now validates that the provided metricValue is a number. If a metric value is provided, and it is not a number, then a warning will be logged.

### Fixed:
- Fixed the documentation for `evaluationReasons` for the `identify` method.

## [5.1.0] - 2024-03-19
### Changed:
- Redact anonymous attributes within feature events
- Always inline contexts for feature events

### Fixed:
- Pin dev version of node to compatible types.

### Removed:
- HTTP fallback ping

## [5.0.3] - 2023-03-21
### Changed:
- Update `LDContext` to allow for key to be optional. This is used when making an anonymous context with a generated key.

## [5.0.2] - 2023-02-15
### Changed:
- Removed usage of optional chaining (`?.`) to improve compatibility with projects which are using older transpilation tooling.

## [5.0.1] - 2023-01-10
### Changed:
- Updated all types in `typings.d.ts` to be exported. This is to ensure that those types are included in generated documentation of dependent SDKs.

## [5.0.0] - 2022-11-30
This major version release of `js-sdk-common` corresponds to the upcoming releases of the `js-client-sdk` v3 and `react-client-sdk` v3, and cannot be used with earlier SDK versions.

### Added:
- Replaced users with contexts. A context is a generalized way of referring to the people, services, machines, or other resources that encounter feature flags in your product. All methods which previously operated on `LDUser` now operate on `LDContext`.

### Changed:
- `LDClient.getUser` has been replaced with `LDClient.getContext`.
- `privateAttributeNames` has been replaced with `privateAttributes`. Private attributes now allow using attribute references, which allow for marking nodes in nested JSON private. 

### Removed:
- Alias events are no longer supported and the `alias` method has been removed from `LDClient`.
- Support for the `secondary` attribute has been removed from `LDUser`.  If a secondary attribute is included in a context, then it is a normal attribute that can be used in rule evaluation, but it will not affect bucketing.
- `allowFrequentDuplicateEvents` has been removed from `LDOptions`. This had been deprecated in a previous version. The default behavior is as if this option had been set to true.
- `autoAliasingOptOut` has been removed from `LDOptions`. This functionality has been superseded by multi-context support.
- `inlineUsersInEvents` has been removed from `LDOptions`. Changes associated with contexts has removed the needed for this option.

### Deprecated:
- The `LDUser`  object has been deprecated. Support for `LDUser` is maintained to simplify the upgrade process, but it is recommended to use `LDContext` in the shape of either `LDSingleKindContext` or `LDMultiKindContext`.

## [4.3.2] - 2022-10-20
### Added:
- Implemented `jitter` and `backoff` for streaming connections. When a connection fails the retry will start at the `streamReconnectDelay` and will double on each unsuccessful consecutive connection attempt (`backoff`) to a max of 30 seconds. The delay will be adjusted from 50%-100% of the calculated delay to prevent many clients from attempting to reconnect at the same time (`jitter`).

### Changed:
- Removed usage of `flatMap`. (Thanks [@mateuszsikora](https://github.com/launchdarkly/js-sdk-common/pull/77))

## [4.3.1] - 2022-10-17
### Fixed:
- Fixed an issue that prevented the `flag-used` inspector from being called.

## [4.3.0] - 2022-10-17
### Added:
- Added support for `Inspectors` that can be used for collecting information for monitoring, analytics, and debugging.

## [4.2.0] - 2022-10-03
### Removed:
- Removed `seenRequests` cache. This cache was used to de-duplicate events, but it has been supplanted with summary events.

### Deprecated:
- The `allowFrequentDuplicateEvents` configuration has been deprecated because it controlled the behavior of the `seenRequests` cache.

## [4.1.1] - 2022-06-07
### Changed:
- Enforce a 64 character limit for `application.id` and `application.version` configuration options.

### Fixed:
- Do not include deleted flags in `allFlags`.

## [4.1.0] - 2022-04-21
### Added:
- `LDOptionsBase.application`, for configuration of application metadata that may be used in LaunchDarkly analytics or other product features. This does not affect feature flag evaluations.

### Fixed:
- The `baseUrl`, `streamUrl`, and `eventsUrl` properties now work properly regardless of whether the URL string has a trailing slash. Previously, a trailing slash would cause request URL paths to have double slashes.

## [4.0.3] - 2022-02-16
### Fixed:
- If the SDK receives invalid JSON data from a streaming connection (possibly as a result of the connection being cut off), it now uses its regular error-handling logic: the error is emitted as an `error` event or, if there are no `error` event listeners, it is logged. Previously, it would be thrown as an unhandled exception.

## [4.0.2] - 2022-01-25
### Removed:
- Removed the `version` export which was originally a constant inserted by the Rollup build, but was no longer usable since Rollup is no longer being used. The SDKs never used this export, since they have `version` properties of their own; the version string of `launchdarkly-js-sdk-common` was never meant to be exposed to applications.

## [4.0.1] - 2022-01-21
### Changed:
- This package is now published as a regular Node module. Previously, it was published as minified bundles created by Rollup. There was no need for this since Rollup is only needed for web code, and the `js-client-sdk` build already runs Rollup to embed the `js-sdk-common` code. Using Rollup caused the platform-dependent behavior of `uuid` to fail because the code for only one platform (browser or Node) was embedded.

## [4.0.0] - 2022-01-14
### Changed:
- Updated `uuid` package to 8.x.
- In TypeScript, the property `LDEvaluationDetail.reason` is now nullable, which correctly reflects the fact that evaluation reasons may not always be available.

### Removed:
- Removed the type `NonNullableLDEvaluationReason`, which was a side effect of the `LDEvaluationDetail.reason` being incorrectly defined before.
- Removed all types, properties, and functions that were deprecated as of the last 3.x release.

## [3.5.1] - 2022-02-17
### Fixed:
- If the SDK receives invalid JSON data from a streaming connection (possibly as a result of the connection being cut off), it now uses its regular error-handling logic: the error is emitted as an `error` event or, if there are no `error` event listeners, it is logged. Previously, it would be thrown as an unhandled exception.

## [3.5.0] - 2022-01-14
### Added:
- New configurable logger factory `commonBasicLogger` and `BasicLoggerOptions`. The `commonBasicLogger` method is not intended to be exported directly in the SDKs, but wrapped to provide platform-specific behavior.

### Fixed:
- Any exceptions thrown by the platform-specific local storage implementation (for instance, if we are in a browser and `window.localstorage` is available but disabled) are now consistently caught, and will only be logged the first time to avoid repetitive logging.

## [3.4.0] - 2021-10-15
### Added:
- Added LDOptionsBase.requestHeaderTransform allowing custom headers to be added to all requests.

## [3.3.4] - 2021-10-15
### Fixed:
- Reverted change to `uuid` dependency while working on some compatibility issues.

## [3.3.3] - 2021-08-23
### Fixed:
- Updated `uuid` dependency to 8.x to remove deprecated usage. ([#46](https://github.com/launchdarkly/js-sdk-common/issues/46))

## [3.3.2] - 2021-06-07
### Fixed:
- Events for the [LaunchDarkly debugger](https://docs.launchdarkly.com/home/flags/debugger) are now properly pre-processed to omit private user attributes, as well as enforce only expected top level attributes are sent.
- Events for the [LaunchDarkly debugger](https://docs.launchdarkly.com/home/flags/debugger) now include the index of the variation responsible for the evaluation result.

## [3.3.1] - 2021-04-01
### Fixed:
- The property `LDOptionsBase.inlineUsersInEvents` was not included in the TypeScript definitions.
- Fixed an outdated documentation link (thanks, [sinchang](https://github.com/launchdarkly/js-sdk-common/pull/36)!)
- Fixed a documentation typo (thanks, [Doesntmeananything](https://github.com/launchdarkly/js-sdk-common/pull/37)!)

## [3.3.0] - 2021-01-26
### Added:
- Added the `alias` method. This method can be used to associate two user objects for analytics purposes. When invoked, this method will queue a new alias event to be sent to LaunchDarkly.
- Added the `autoAliasingOptOut` configuration option. This can be used to control the new automatic aliasing behavior of the `identify` method; by passing `autoAliasingOptOut: true`, `identify` will not automatically generate alias events.

### Changed:
- The `identify` method will now automatically generate an alias event when switching from an anonymous to a known user. This event associates the two users for analytics purposes as they most likely represent a single person.

## [3.2.12] - 2021-01-25
### Changed:
- When creating a stream connection, we now set a `streamReadTimeoutMillis` option which is hard-coded to the standard LaunchDarkly stream timeout of 5 minutes. This option is implemented by [`launchdarkly-eventsource`](https://github.com/launchdarkly/js-eventsource) 1.4.0 and higher, and should be ignored by SDKs that are not using that EventSource implementation.

## [3.2.11] - 2020-11-17
### Fixed:
- Updated the `LDEvaluationDetail.reason` type definition to be nullable. This value will be `null` when `LDOptions.evaluationReasons` is `false`.

## [3.2.10] - 2020-09-14
### Fixed:
- In streaming mode, when connecting to the Relay Proxy rather than directly to the LaunchDarkly streaming service, if the current user was changed twice within a short time it was possible for the SDK to revert to flag values from the previous user.

## [3.2.9] - 2020-07-10
### Fixed:
- Removed uses of `String.startsWith` that caused errors in Internet Explorer unless a polyfill for that function was present.

## [3.2.8] - 2020-05-13
### Fixed:
- The TypeScript declaration for `track()` was missing the optional `metricValue` parameter. ([#23](https://github.com/launchdarkly/js-sdk-common/issues/23))

## [3.2.7] - 2020-04-30
### Fixed:
- Some diagnostic event data was being sent twice, resulting in extra HTTP requests. This did not affect analytics events, so customer data on the dashboard and in data export would still be correct.

## [3.2.6] - 2020-03-31
### Fixed:
- The default logging implementation (`createConsoleLogger`) could throw errors in Internet Explorer 11 if log output (of an enabled level) happened while the developer tools were _not_ open. This is because in IE 11, the `console` object [does not exist](https://www.beyondjava.net/console-log-surprises-with-internet-explorer-11-and-edge) unless the tools are open. This has been fixed so the logger does not try to use `console` unless it currently has a value.

## [3.2.5] - 2020-03-18
### Fixed:
- Fixed incorrect usage of `Object.hasOwnProperty` which could have caused an error if a feature flag had `hasOwnProperty` as its flag key.

## [3.2.4] - 2020-03-18
### Fixed:
- Some users reported an error where the SDK said that the content type of a response was `&#34;application/json, application/json; charset=utf8&#34;`. It is invalid to have multiple Content-Type values in a response and the LaunchDarkly service does not do this, but an improperly configured proxy/gateway might add such a header. Now the SDK will tolerate a value like this as long as it starts with `&#34;application/json&#34;`.

## [3.2.3] - 2020-03-06
### Fixed:
- At client initialization time, if the initial flag polling request failed, it would cause an unhandled promise rejection unless the application had called `waitForInitialization()` and provided an error handler for the promise that was returned by that method. While that is correct behavior if the application did call `waitForInitialization()` (any promise that might be rejected should have an error handler attached), it is highly undesirable if the application did not call `waitForInitialization()` at all-- which is not mandatory, since the application could use events instead, or `waitUntilReady()`, or might simply not care about waiting for initialization. This has been fixed so that no such promise is created until the first time the application calls `waitForInitialization()`; subsequent calls to the same method will return the same promise (since initialization can only happen once).
- A bug in the event emitter made its behavior unpredictable if an event handler called `on` or `off` while handling an event. This has been fixed so that all event handlers that were defined _at the time the event was fired_ will be called; any changes made will not take effect until the next event.

## [3.2.2] - 2020-02-13
### Fixed:
- When sending stream connection statistics in diagnostic event data, always specify the `failed` property even if it is false. This only affects LaunchDarkly&#39;s internal analytics.

## [3.2.1] - 2020-02-13
### Fixed:
- When using secure mode in conjunction with streaming mode, if an application specified a new `hash` parameter while changing the current user with `identify()`, the SDK was not using the new `hash` value when recomputing the stream URL, causing the stream to fail. ([#13](https://github.com/launchdarkly/js-sdk-common/issues/13))

## [3.2.0] - 2020-02-12
### Added:
- The SDKs now periodically send diagnostic data to LaunchDarkly, describing the version and configuration of the SDK, the architecture and version of the runtime platform (provided by the platform-specific SDK packages), and performance statistics. No credentials, hostnames, or other identifiable values are included. This behavior can be disabled with the `diagnosticOptOut` option or configured with `diagnosticRecordingInterval`.

## [3.1.2] - 2020-01-31
### Removed:
- Removed an unused dependency on `@babel/polyfill`. (Thanks, [bdwain](https://github.com/launchdarkly/js-sdk-common/pull/7)!)
- Changed exact version dependencies to "highest compatible" dependencies, to avoid having modules that are also used by the host application loaded twice by NPM. ([#8](https://github.com/launchdarkly/js-sdk-common/issues/8))

## [3.1.1] - 2020-01-15
### Fixed:
- The SDK now specifies a uniquely identifiable request header when sending events to LaunchDarkly to ensure that events are only processed once, even if the SDK sends them two times due to a failed initial attempt.

## [3.1.0] - 2019-12-13
### Added:
- Configuration options `wrapperName` and `wrapperVersion`.
- Platform option `httpFallbackPing` (to be used for the browser image mechanism - see below).

### Fixed:
- When calling `identify`, the current user (as reported by `getUser()`) was being updated before the SDK had received the new flag values for that user, causing the client to be temporarily in an inconsistent state where flag evaluations would be associated with the wrong user in analytics events. Now, the current-user state will stay in sync with the flags and change only when they have finished changing. (Thanks, [edvinerikson](https://github.com/launchdarkly/js-sdk-common/pull/3)!)

### Removed:
- Logic for sending a one-way HTTP request in a browser by creating an image has been moved to the browser-specific code (`js-client-sdk`).


## [3.0.0] - 2019-12-13
### Added:
- Configuration property `eventCapacity`: the maximum number of analytics events (not counting evaluation counters) that can be held at once, to prevent the SDK from consuming unexpected amounts of memory in case an application generates events unusually rapidly. In JavaScript code this would not normally be an issue, since the SDK flushes events every two seconds by default, but you may wish to increase this value if you will intentionally be generating a high volume of custom or identify events. The default value is 100.

### Changed:
- (Breaking change) The `extraDefaults` parameter to the internal common `initialize` method is now `extraOptionDefs` and has a different format, allowing for more flexible validation.
- The SDK now logs a warning if any configuration property has an inappropriate type, such as `baseUri:3` or `sendEvents:"no"`. For boolean properties, the SDK will still interpret the value in terms of truthiness, which was the previous behavior. For all other types, since there's no such commonly accepted way to coerce the type, it will fall back to the default setting for that property; previously, the behavior was undefined but most such mistakes would have caused the SDK to throw an exception at some later point.
- Removed or updated some development dependencies that were causing vulnerability warnings.

### Deprecated:
- The `samplingInterval` configuration property was deprecated in the code in the previous minor version release, and in the changelog, but the deprecation notice was accidentally omitted from the documentation comments. It is hereby deprecated again.


## [2.14.1] - 2019-11-04
### Fixed:
- Removed uses of `Object.assign` that caused errors in Internet Explorer unless a polyfill for that function was present.



Prior to the 2.15.0 release, this code was a monorepo subpackage in the [`js-client-sdk`](https://github.com/launchdarkly/js-client-sdk) repo. See the [changelog](https://github.com/launchdarkly/js-client-sdk/blob/2.14.0/CHANGELOG.md) in that repo for changes prior to that version. It is now maintained in this repo and has its own versioning and changelog.
