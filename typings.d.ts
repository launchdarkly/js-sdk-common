/**
 * Basic LaunchDarkly JavaScript client interfaces, shared between the browser SDK and the Electron SDK.
 */
declare module 'launchdarkly-js-sdk-common' {

  /**
   * The current version string of the SDK.
   */
  export const version: string;

  /**
   * The types of values a feature flag can have.
   *
   * Flags can have any JSON-serializable value.
   */
  export type LDFlagValue = any;

  /**
   * A map of feature flags from their keys to their values.
   */
  export interface LDFlagSet {
    [key: string]: LDFlagValue;
  }

  /**
   * A map of feature flag keys to objects holding changes in their values.
   */
  export interface LDFlagChangeset {
    [key: string]: {
      current: LDFlagValue;
      previous: LDFlagValue;
    };
  }

  /**
   * The minimal interface for any object that LDClient can use for logging.
   *
   * The client uses four log levels, with "error" being the most severe. Each corresponding
   * logger method takes a single string parameter. The logger implementation is responsible
   * for deciding whether to produce output or not based on the level.
   */
  export interface LDLogger {
    debug: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  }

  /**
   * A basic implementation of logging that uses the global `console` object. This is used by
   * default in the browser SDK. It sends messages of "debug", "info", "warn", or "error"
   * level (if enable) to `console.log()`, `console.info()`, `console.warn()`, and `console.error()`
   * respectively.
   *
   * To make LDClient use this logger, put it in the `logger` property of [[LDOptions]].
   * 
   * @deprecated Please use `basicLogger` instead.
   */
  export function createConsoleLogger(minimumLevel: string): LDLogger;

  /**
   * LaunchDarkly initialization options that are supported by all variants of the JS client.
   * The browser SDK and Electron SDK may support additional options.
   *
   * @ignore (don't need to show this separately in TypeDoc output; all properties will be shown in LDOptions)
   */
  export interface LDOptionsBase {
    /**
     * An object that will perform logging for the client.
     *
     * If not specified, the default is to use `basicLogger`.
     */
    logger?: LDLogger;

    /**
     * The initial set of flags to use until the remote set is retrieved.
     *
     * If `"localStorage"` is specified, the flags will be saved and retrieved from browser local
     * storage. Alternatively, an [[LDFlagSet]] can be specified which will be used as the initial
     * source of flag values. In the latter case, the flag values will be available via [[variation]]
     * immediately after calling `initialize()` (normally they would not be available until the
     * client signals that it is ready).
     *
     * For more information, see the [SDK Reference Guide](https://docs.launchdarkly.com/sdk/features/bootstrapping#javascript).
     */
    bootstrap?: 'localStorage' | LDFlagSet;

    /**
     * The base URL for the LaunchDarkly server.
     *
     * Most users should use the default value.
     */
    baseUrl?: string;

    /**
     * The base URL for the LaunchDarkly events server.
     *
     * Most users should use the default value.
     */
    eventsUrl?: string;

    /**
     * The base URL for the LaunchDarkly streaming server.
     *
     * Most users should use the default value.
     */
    streamUrl?: string;

    /**
     * Whether or not to open a streaming connection to LaunchDarkly for live flag updates.
     *
     * If this is true, the client will always attempt to maintain a streaming connection; if false,
     * it never will. If you leave the value undefined (the default), the client will open a streaming
     * connection if you subscribe to `"change"` or `"change:flag-key"` events (see [[LDClient.on]]).
     *
     * This is equivalent to calling `client.setStreaming()` with the same value.
     */
    streaming?: boolean;

    /**
     * Whether or not to use the REPORT verb to fetch flag settings.
     *
     * If this is true, flag settings will be fetched with a REPORT request
     * including a JSON entity body with the user object.
     *
     * Otherwise (by default) a GET request will be issued with the user passed as
     * a base64 URL-encoded path parameter.
     *
     * Do not use unless advised by LaunchDarkly.
     */
    useReport?: boolean;

    /**
     * Whether or not to include custom HTTP headers when requesting flags from LaunchDarkly.
     *
     * These are used to send metadata about the SDK (such as the version). They
     * are also used to send the application.id and application.version set in
     * the options.
     * 
     * This defaults to true (custom headers will be sent). One reason you might
     * want to set it to false is that the presence of custom headers causes
     * browsers to make an extra OPTIONS request (a CORS preflight check) before
     * each flag request, which could affect performance.
     */
    sendLDHeaders?: boolean;

    /**
     * A transform function for dynamic configuration of HTTP headers.
     *
     * This method will run last in the header generation sequence, so the function should have
     * all system generated headers in case those also need to be modified.
     */
    requestHeaderTransform?: (headers: Map<string, string>) => Map<string, string>;

    /**
     * Whether LaunchDarkly should provide additional information about how flag values were
     * calculated.
     *
     * The additional information will then be available through the client's
     * [[LDClient.variationDetail]] method. Since this increases the size of network requests,
     * such information is not sent unless you set this option to true.
     */
    evaluationReasons?: boolean;

    /**
     * Whether to send analytics events back to LaunchDarkly. By default, this is true.
     */
    sendEvents?: boolean;

    /**
     * Whether all user attributes (except the user key) should be marked as private, and
     * not sent to LaunchDarkly in analytics events.
     *
     * By default, this is false.
     */
    allAttributesPrivate?: boolean;

    /**
     * The names of user attributes that should be marked as private, and not sent
     * to LaunchDarkly in analytics events. You can also specify this on a per-user basis
     * with [[LDUser.privateAttributeNames]].
     */
    privateAttributeNames?: Array<string>;

    /**
     * Whether to include full user details in every analytics event.
     *
     * The default is `false`: events will only include the user key, except for one "index" event
     * that provides the full details for the user.
     */
    inlineUsersInEvents?: boolean;

    /**
     * This option is deprecated, and setting it has no effect.
     *
     * The behavior is now to allow frequent duplicate events.
     *
     * This is not a problem because most events will be summarized, and
     * events which are not summarized are important to the operation of features such as
     * experimentation.
     */
    allowFrequentDuplicateEvents?: boolean;

    /**
     * Whether analytics events should be sent only when you call variation (true), or also when you
     * call allFlags (false).
     *
     * By default, this is false (events will be sent in both cases).
     */
    sendEventsOnlyForVariation?: boolean;

    /**
     * The capacity of the analytics events queue.
     *
     * The client buffers up to this many events in memory before flushing. If the capacity is exceeded
     * before the queue is flushed, events will be discarded. Increasing the capacity means that events
     * are less likely to be discarded, at the cost of consuming more memory. Note that in regular usage
     * flag evaluations do not produce individual events, only summary counts, so you only need a large
     * capacity if you are generating a large number of click, pageview, or identify events (or if you
     * are using the event debugger).
     *
     * The default value is 100.
     */
    eventCapacity?: number;

    /**
     * The interval in between flushes of the analytics events queue, in milliseconds.
     *
     * The default value is 2000ms.
     */
    flushInterval?: number;

    /**
     * If specified, enables event sampling so that only some fraction of analytics events will be
     * sent pseudo-randomly.
     *
     * When set to greater than zero, there is a 1 in `samplingInterval` chance that events will be
     * sent: for example, a value of 20 means that on average 1 in 20, or 5%, of all events will be sent.
     *
     * @deprecated This feature will be removed in a future version.
     */
    samplingInterval?: number;

    /**
     * How long (in milliseconds) to wait after a failure of the stream connection before trying to
     * reconnect.
     *
     * This only applies if streaming has been enabled by setting [[streaming]] to true or
     * subscribing to `"change"` events. The default is 1000ms.
     */
    streamReconnectDelay?: number;

    /**
     * Set to true to opt out of sending diagnostics data.
     *
     * Unless `diagnosticOptOut` is set to true, the client will send some diagnostics data to the LaunchDarkly
     * servers in order to assist in the development of future SDK improvements. These diagnostics consist of
     * an initial payload containing some details of SDK in use, the SDK's configuration, and the platform the
     * SDK is being run on, as well as payloads sent periodically with information on irregular occurrences such
     * as dropped events.
     */
    diagnosticOptOut?: boolean;

    /**
     * The interval at which periodic diagnostic data is sent, in milliseconds.
     *
     * The default is 900000 (every 15 minutes) and the minimum value is 6000. See [[diagnosticOptOut]]
     * for more information on the diagnostics data being sent.
     */
    diagnosticRecordingInterval?: number;

    /**
     * For use by wrapper libraries to set an identifying name for the wrapper being used.
     *
     * This will be sent as diagnostic information to the LaunchDarkly servers to allow recording
     * metrics on the usage of these wrapper libraries.
     */
    wrapperName?: string;

    /**
     * For use by wrapper libraries to set version to be included alongside `wrapperName`.
     *
     * If `wrapperName` is unset, this field will be ignored.
     */
    wrapperVersion?: string;

    /**
     * Whether to disable the automatic sending of an alias event when [[identify]] is
     * called with a non-anonymous user when the previous user is anonymous.
     *
     * The default value is `false`.
     */
    autoAliasingOptOut?: boolean;

    /**
     * Information about the application where the LaunchDarkly SDK is running.
     */
    application?: {
      /**
       * A unique identifier representing the application where the LaunchDarkly SDK is running.
       * 
       * This can be specified as any string value as long as it only uses the following characters: ASCII letters,
       * ASCII digits, period, hyphen, underscore. A string containing any other characters will be ignored.
       * 
       * Example: `authentication-service`
       */
      id?: string;

      /**
       * A unique identifier representing the version of the application where the LaunchDarkly SDK is running.
       * 
       * This can be specified as any string value as long as it only uses the following characters: ASCII letters,
       * ASCII digits, period, hyphen, underscore. A string containing any other characters will be ignored.
       * 
       * Example: `1.0.0` (standard version string) or `abcdef` (sha prefix)
       */
      version?: string;
    }

    /**
     * Inspectors can be used for collecting information for monitoring, analytics, and debugging.
     */
    inspectors?: LDInspection[];
  }

  /**
   * A LaunchDarkly user object.
   */
  export interface LDUser {
    /**
     * A unique string identifying a user.
     *
     * If you omit this property, and also set `anonymous` to `true`, the SDK will generate a UUID string
     * and use that as the key; it will attempt to persist that value in local storage if possible so the
     * next anonymous user will get the same key, but if local storage is unavailable then it will
     * generate a new key each time you specify the user.
     *
     * It is an error to omit the `key` property if `anonymous` is not set.
     */
    key?: string;

    /**
     * An optional secondary key for a user. This affects
     * [feature flag targeting](https://docs.launchdarkly.com/home/flags/targeting-users#targeting-rules-based-on-user-attributes)
     * as follows: if you have chosen to bucket users by a specific attribute, the secondary key (if set)
     * is used to further distinguish between users who are otherwise identical according to that attribute.
     */
    secondary?: string;

    /**
     * The user's name.
     *
     * You can search for users on the User page by name.
     */
    name?: string;

    /**
     * The user's first name.
     */
    firstName?: string;

    /**
     * The user's last name.
     */
    lastName?: string;

    /**
     * The user's email address.
     *
     * If an `avatar` URL is not provided, LaunchDarkly will use Gravatar
     * to try to display an avatar for the user on the Users page.
     */
    email?: string;

    /**
     * An absolute URL to an avatar image for the user.
     */
    avatar?: string;

    /**
     * The user's IP address.
     */
    ip?: string;

    /**
     * The country associated with the user.
     */
    country?: string;

    /**
     * Whether to show the user on the Users page in LaunchDarkly.
     */
    anonymous?: boolean;

    /**
     * Any additional attributes associated with the user.
     */
    custom?: {
      [key: string]: string | boolean | number | Array<string | boolean | number>;
    };

    /**
     * Specifies a list of attribute names (either built-in or custom) which should be
     * marked as private, and not sent to LaunchDarkly in analytics events. This is in
     * addition to any private attributes designated in the global configuration
     * with [[LDOptions.privateAttributeNames]] or [[LDOptions.allAttributesPrivate]].
     */
    privateAttributeNames?: Array<string>;
  }

  /**
   * Describes the reason that a flag evaluation produced a particular value. This is
   * part of the [[LDEvaluationDetail]] object returned by [[LDClient.variationDetail]].
   *
   * This type is separate from `[[LDEvaluationReason]]` for backwards compatibility. In
   * earlier versions of this SDK, `[[LDEvaluationReason]]` was incorrectly defined as
   * being non-nullable.
   */
  interface NonNullableLDEvaluationReason {
    /**
     * The general category of the reason:
     *
     * - `'OFF'`: The flag was off and therefore returned its configured off value.
     * - `'FALLTHROUGH'`: The flag was on but the user did not match any targets or rules.
     * - `'TARGET_MATCH'`: The user key was specifically targeted for this flag.
     * - `'RULE_MATCH'`: the user matched one of the flag's rules.
     * - `'PREREQUISITE_FAILED'`: The flag was considered off because it had at least one
     *   prerequisite flag that either was off or did not return the desired variation.
     * - `'ERROR'`: The flag could not be evaluated, e.g. because it does not exist or due
     *   to an unexpected error.
     */
    kind: string;

    /**
     * A further description of the error condition, if the kind was `'ERROR'`.
     */
    errorKind?: string;

    /**
     * The index of the matched rule (0 for the first), if the kind was `'RULE_MATCH'`.
     */
    ruleIndex?: number;

    /**
     * The unique identifier of the matched rule, if the kind was `'RULE_MATCH'`.
     */
    ruleId?: string;

    /**
     * The key of the failed prerequisite flag, if the kind was `'PREREQUISITE_FAILED'`.
     */
    prerequisiteKey?: string;
  }

  /**
   * Describes the reason that a flag evaluation produced a particular value. This is
   * part of the [[LDEvaluationDetail]] object returned by [[LDClient.variationDetail]].
   *
   * Will be null when `[[LDOptions.evaluationReasons]]` is `false`.
   */
  export type LDEvaluationReason = NonNullableLDEvaluationReason | null;

  /**
   * An object that combines the result of a feature flag evaluation with information about
   * how it was calculated.
   *
   * This is the result of calling [[LDClient.variationDetail]].
   *
   * For more information, see the [SDK reference guide](https://docs.launchdarkly.com/sdk/features/evaluation-reasons#javascript).
   */
  export interface LDEvaluationDetail {
    /**
     * The result of the flag evaluation. This will be either one of the flag's variations or
     * the default value that was passed to [[LDClient.variationDetail]].
     */
    value: LDFlagValue;

    /**
     * The index of the returned value within the flag's list of variations, e.g. 0 for the
     * first variation-- or `null` if the default value was returned.
     */
    variationIndex?: number;

    /**
     * An object describing the main factor that influenced the flag evaluation value.
     */
    reason: LDEvaluationReason;
  }

  /**
   * The basic interface for the LaunchDarkly client. Platform-specific SDKs may add some methods of their own.
   *
   * @see https://docs.launchdarkly.com/sdk/client-side/javascript
   *
   * @ignore (don't need to show this separately in TypeDoc output; all methods will be shown in LDClient)
   */
  export interface LDClientBase {
    /**
     * Returns a Promise that tracks the client's initialization state.
     *
     * The returned Promise will be resolved once the client has either successfully initialized
     * or failed to initialize (e.g. due to an invalid environment key or a server error). It will
     * never be rejected.
     *
     * ```
     *     // using a Promise then() handler
     *     client.waitUntilReady().then(() => {
     *         doSomethingWithClient();
     *     });
     *
     *     // using async/await
     *     await client.waitUntilReady();
     *     doSomethingWithClient();
     * ```
     *
     * If you want to distinguish between these success and failure conditions, use
     * [[waitForInitialization]] instead.
     *
     * If you prefer to use event listeners ([[on]]) rather than Promises, you can listen on the
     * client for a `"ready"` event, which will be fired in either case.
     *
     * @returns
     *   A Promise that will be resolved once the client is no longer trying to initialize.
     */
    waitUntilReady(): Promise<void>;

    /**
     * Returns a Promise that tracks the client's initialization state.
     *
     * The Promise will be resolved if the client successfully initializes, or rejected if client
     * initialization has irrevocably failed (for instance, if it detects that the SDK key is invalid).
     *
     * ```
     *     // using Promise then() and catch() handlers
     *     client.waitForInitialization().then(() => {
     *         doSomethingWithSuccessfullyInitializedClient();
     *     }).catch(err => {
     *         doSomethingForFailedStartup(err);
     *     });
     *
     *     // using async/await
     *     try {
     *         await client.waitForInitialization();
     *         doSomethingWithSuccessfullyInitializedClient();
     *     } catch (err) {
     *         doSomethingForFailedStartup(err);
     *     }
     * ```
     *
     * It is important that you handle the rejection case; otherwise it will become an unhandled Promise
     * rejection, which is a serious error on some platforms. The Promise is not created unless you
     * request it, so if you never call `waitForInitialization()` then you do not have to worry about
     * unhandled rejections.
     *
     * Note that you can also use event listeners ([[on]]) for the same purpose: the event `"initialized"`
     * indicates success, and `"failed"` indicates failure.
     *
     * @returns
     *   A Promise that will be resolved if the client initializes successfully, or rejected if it
     *   fails.
     */
    waitForInitialization(): Promise<void>;

    /**
     * Identifies a user to LaunchDarkly.
     *
     * Unlike the server-side SDKs, the client-side JavaScript SDKs maintain a current user state,
     * which is set at initialization time. You only need to call `identify()` if the user has changed
     * since then.
     *
     * Changing the current user also causes all feature flag values to be reloaded. Until that has
     * finished, calls to [[variation]] will still return flag values for the previous user. You can
     * use a callback or a Promise to determine when the new flag values are available.
     *
     * @param user
     *   The user properties. Must contain at least the `key` property.
     * @param hash
     *   The signed user key if you are using [Secure Mode](https://docs.launchdarkly.com/sdk/features/secure-mode#configuring-secure-mode-in-the-javascript-client-side-sdk).
     * @param onDone
     *   A function which will be called as soon as the flag values for the new user are available,
     *   with two parameters: an error value (if any), and an [[LDFlagSet]] containing the new values
     *   (which can also be obtained by calling [[variation]]). If the callback is omitted, you will
     *   receive a Promise instead.
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which resolve once the flag
     *   values for the new user are available, providing an [[LDFlagSet]] containing the new values
     *   (which can also be obtained by calling [[variation]]).
     */
    identify(user: LDUser, hash?: string, onDone?: (err: Error | null, flags: LDFlagSet | null) => void): Promise<LDFlagSet>;

    /**
     * Returns the client's current user.
     *
     * This is the user that was most recently passed to [[identify]], or, if [[identify]] has never
     * been called, the initial user specified when the client was created.
     */
    getUser(): LDUser;

    /**
     * Flushes all pending analytics events.
     *
     * Normally, batches of events are delivered in the background at intervals determined by the
     * `flushInterval` property of [[LDOptions]]. Calling `flush()` triggers an immediate delivery.
     *
     * @param onDone
     *   A function which will be called when the flush completes. If omitted, you
     *   will receive a Promise instead.
     *
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which resolves once
     *   flushing is finished. Note that the Promise will be rejected if the HTTP request
     *   fails, so be sure to attach a rejection handler to it.
     */
    flush(onDone?: () => void): Promise<void>;

    /**
     * Determines the variation of a feature flag for the current user.
     *
     * In the client-side JavaScript SDKs, this is always a fast synchronous operation because all of
     * the feature flag values for the current user have already been loaded into memory.
     *
     * @param key
     *   The unique key of the feature flag.
     * @param defaultValue
     *   The default value of the flag, to be used if the value is not available from LaunchDarkly.
     * @returns
     *   The flag's value.
     */
    variation(key: string, defaultValue?: LDFlagValue): LDFlagValue;

    /**
     * Determines the variation of a feature flag for a user, along with information about how it was
     * calculated.
     *
     * Note that this will only work if you have set `evaluationExplanations` to true in [[LDOptions]].
     * Otherwise, the `reason` property of the result will be null.
     *
     * The `reason` property of the result will also be included in analytics events, if you are
     * capturing detailed event data for this flag.
     *
     * For more information, see the [SDK reference guide](https://docs.launchdarkly.com/sdk/features/evaluation-reasons#javascript).
     *
     * @param key
     *   The unique key of the feature flag.
     * @param defaultValue
     *   The default value of the flag, to be used if the value is not available from LaunchDarkly.
     *
     * @returns
     *   An [[LDEvaluationDetail]] object containing the value and explanation.
     */
    variationDetail(key: string, defaultValue?: LDFlagValue): LDEvaluationDetail;

    /**
     * Specifies whether or not to open a streaming connection to LaunchDarkly for live flag updates.
     *
     * If this is true, the client will always attempt to maintain a streaming connection; if false,
     * it never will. If you leave the value undefined (the default), the client will open a streaming
     * connection if you subscribe to `"change"` or `"change:flag-key"` events (see [[LDClient.on]]).
     *
     * This can also be set as the `streaming` property of [[LDOptions]].
     */
    setStreaming(value?: boolean): void;

    /**
     * Registers an event listener.
     *
     * The following event names (keys) are used by the client:
     *
     * - `"ready"`: The client has finished starting up. This event will be sent regardless
     *   of whether it successfully connected to LaunchDarkly, or encountered an error
     *   and had to give up; to distinguish between these cases, see below.
     * - `"initialized"`: The client successfully started up and has valid feature flag
     *   data. This will always be accompanied by `"ready"`.
     * - `"failed"`: The client encountered an error that prevented it from connecting to
     *   LaunchDarkly, such as an invalid environment ID. All flag evaluations will
     *   therefore receive default values. This will always be accompanied by `"ready"`.
     * - `"error"`: General event for any kind of error condition during client operation.
     *   The callback parameter is an Error object. If you do not listen for "error"
     *   events, then the errors will be logged with `console.log()`.
     * - `"change"`: The client has received new feature flag data. This can happen either
     *   because you have switched users with [[identify]], or because the client has a
     *   stream connection and has received a live change to a flag value (see below).
     *   The callback parameter is an [[LDFlagChangeset]].
     * - `"change:FLAG-KEY"`: The client has received a new value for a specific flag
     *   whose key is `FLAG-KEY`. The callback receives two parameters: the current (new)
     *   flag value, and the previous value. This is always accompanied by a general
     *   `"change"` event as described above; you can listen for either or both.
     *
     * The `"change"` and `"change:FLAG-KEY"` events have special behavior: by default, the
     * client will open a streaming connection to receive live changes if and only if
     * you are listening for one of these events. This behavior can be overridden by
     * setting `streaming` in [[LDOptions]] or calling [[LDClient.setStreaming]].
     *
     * @param key
     *   The name of the event for which to listen.
     * @param callback
     *   The function to execute when the event fires. The callback may or may not
     *   receive parameters, depending on the type of event; see [[LDEventSignature]].
     * @param context
     *   The `this` context to use for the callback.
     */
    on(key: string, callback: (...args: any[]) => void, context?: any): void;

    /**
     * Deregisters an event listener. See [[on]] for the available event types.
     *
     * @param key
     *   The name of the event for which to stop listening.
     * @param callback
     *   The function to deregister.
     * @param context
     *   The `this` context for the callback, if one was specified for [[on]].
     */
    off(key: string, callback: (...args: any[]) => void, context?: any): void;

    /**
     * Track page events to use in goals or A/B tests.
     *
     * LaunchDarkly automatically tracks pageviews and clicks that are specified in the
     * Goals section of their dashboard. This can be used to track custom goals or other
     * events that do not currently have goals.
     *
     * @param key
     *   The name of the event, which may correspond to a goal in A/B tests.
     * @param data
     *   Additional information to associate with the event.
     * @param metricValue
     *   An optional numeric value that can be used by the LaunchDarkly experimentation
     *   feature in numeric custom metrics. Can be omitted if this event is used by only
     *   non-numeric metrics. This field will also be returned as part of the custom event
     *   for Data Export.
     */
    track(key: string, data?: any, metricValue?: number): void;

    /**
     * Associates two users for analytics purposes.
     *
     * This can be helpful in the situation where a person is represented by multiple
     * LaunchDarkly users. This may happen, for example, when a person initially logs into
     * an application-- the person might be represented by an anonymous user prior to logging
     * in and a different user after logging in, as denoted by a different user key.
     *
     * @param user
     *   The newly identified user.
     * @param previousUser
     *   The previously identified user.
     */
    alias(user: LDUser, previousUser: LDUser): void;

    /**
     * Returns a map of all available flags to the current user's values.
     *
     * @returns
     *   An object in which each key is a feature flag key and each value is the flag value.
     *   Note that there is no way to specify a default value for each flag as there is with
     *   [[variation]], so any flag that cannot be evaluated will have a null value.
     */
    allFlags(): LDFlagSet;

   /**
    * Shuts down the client and releases its resources, after delivering any pending analytics
    * events. After the client is closed, all calls to [[variation]] will return default values,
    * and it will not make any requests to LaunchDarkly.
    *
    * @param onDone
    *   A function which will be called when the operation completes. If omitted, you
    *   will receive a Promise instead.
    *
    * @returns
    *   If you provided a callback, then nothing. Otherwise, a Promise which resolves once
    *   closing is finished. It will never be rejected.
    */
   close(onDone?: () => void): Promise<void>;
  }

  /**
   * Provides a simple [[LDLogger]] implementation.
   *
   * This logging implementation uses a simple format that includes only the log level
   * and the message text. Output is written to the console unless otherwise specified.
   * You can filter by log level as described in [[BasicLoggerOptions.level]].
   *
   * To use the logger created by this function, put it into [[LDOptions.logger]]. If
   * you do not set [[LDOptions.logger]] to anything, the SDK uses a default logger
   * that is equivalent to `ld.basicLogger({ level: 'info' })`.
   *
   * @param options Configuration for the logger. If no options are specified, the
   *   logger uses `{ level: 'info' }`.
   *
   * @param formatter An optional function equivalent to Node's util.format, allowing
   *   for parameter substitution in log messages. If this is omitted, parameter
   *   substitution is not available.
   * 
   * @example
   * This example shows how to use `basicLogger` in your SDK options to enable console
   * logging only at `warn` and `error` levels.
   * ```javascript
   *   const ldOptions = {
   *     logger: ld.basicLogger({ level: 'warn' }),
   *   };
   * ```
   *
   * @example
   * This example shows how to use `basicLogger` in your SDK options to cause log
   * output to always go to `console.error` instead of `console.log`.
   * ```javascript
   *   const ldOptions = {
   *     logger: ld.basicLogger({ destination: console.error }),
   *   };
   * ```
   * 
   * @ignore (don't need to show this separately in TypeDoc output; each SDK should provide its own
   *   basicLogger function that delegates to this and sets the formatter parameter)
   */
   export function commonBasicLogger(
    options?: BasicLoggerOptions,
    formatter?: (format: string, ...args: any[]) => void
  ): LDLogger;

  /**
   * Configuration for [[basicLogger]].
   */
  export interface BasicLoggerOptions {
    /**
     * The lowest level of log message to enable.
     *
     * See [[LDLogLevel]] for a list of possible levels. Setting a level here causes
     * all lower-importance levels to be disabled: for instance, if you specify
     * `'warn'`, then `'debug'` and `'info'` are disabled.
     *
     * If not specified, the default is `'info'` (meaning that `'debug'` is disabled).
     */
    level?: LDLogLevel;

    /**
     * A string to prepend to all log output. If not specified, the default is
     * "[LaunchDarkly] ".
     */
    prefix?: string;

    /**
     * An optional function to use to print each log line.
     *
     * If this is specified, `basicLogger` calls it to write each line of output. The
     * argument is a fully formatted log line, not including a linefeed. The function
     * is only called for log levels that are enabled.
     *
     * If not specified, the default in browsers is to use `console.log`, `console.info`,
     * `console.warn`, or `console.error` according to the level; the default in
     * Node.js and Electron is to always use `console.log`.
     *
     * Setting this property to anything other than a function will cause SDK
     * initialization to fail.
     */
    destination?: (line: string) => void,
  }

  /**
   * Logging levels that can be used with [[basicLogger]].
   *
   * Set [[BasicLoggerOptions.level]] to one of these values to control what levels
   * of log messages are enabled. Going from lowest importance (and most verbose)
   * to most importance, the levels are `'debug'`, `'info'`, `'warn'`, and `'error'`.
   * You can also specify `'none'` instead to disable all logging.
   */
  export type LDLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

  /**
   * Callback interface for collecting information about the SDK at runtime.
   * 
   * This interface is used to collect information about flag usage.
   * 
   * This interface should not be used by the application to access flags for the purpose of controlling application
   * flow. It is intended for monitoring, analytics, or debugging purposes.
   */
  interface LDInspectionFlagUsedHandler {
    type: 'flag-used',

    /**
     * Name of the inspector. Will be used for logging issues with the inspector.
     */
    name: string,

    /**
     * This method is called when a flag is accessed via a variation method, or it can be called based on actions in
     * wrapper SDKs which have different methods of tracking when a flag was accessed. It is not called when a call is made
     * to allFlags.
     */
    method: (flagKey: string, flagDetail: LDEvaluationDetail, user: LDUser) => void;
  }
  
  /**
   * Callback interface for collecting information about the SDK at runtime.
   * 
   * This interface is used to collect information about flag data. In order to understand the
   * current flag state it should be combined with {@link LDInspectionFlagValueChangedHandler}.
   * This interface will get the initial flag information, and 
   * {@link LDInspectionFlagValueChangedHandler} will provide changes to individual flags.
   * 
   * This interface should not be used by the application to access flags for the purpose of controlling application
   * flow. It is intended for monitoring, analytics, or debugging purposes.
   */
  interface LDInspectionFlagDetailsChangedHandler {
    type: 'flag-details-changed',

    /**
     * Name of the inspector. Will be used for logging issues with the inspector.
     */
    name: string,
    
    /**
     * This method is called when the flags in the store are replaced with new flags. It will contain all flags
     * regardless of if they have been evaluated.
     */
    method: (details: Record<string, LDEvaluationDetail>) => void;
  }
  
    
  /**
   * Callback interface for collecting information about the SDK at runtime.
   * 
   * This interface is used to collect changes to flag data, but does not provide the initial
   * data. It can be combined with {@link LDInspectionFlagValuesChangedHandler} to track the
   * entire flag state.
   * 
   * This interface should not be used by the application to access flags for the purpose of controlling application
   * flow. It is intended for monitoring, analytics, or debugging purposes.
   */
  interface LDInspectionFlagDetailChangedHandler {
    type: 'flag-detail-changed',

    /**
     * Name of the inspector. Will be used for logging issues with the inspector.
     */
    name: string,
  
    /**
     * This method is called when a flag is updated. It will not be called
     * when all flags are updated.
     */
    method: (flagKey: string, detail: LDEvaluationDetail) => void;
  }

  /**
   * Callback interface for collecting information about the SDK at runtime.
   * 
   * This interface is used to track current identity state of the SDK.
   * 
   * This interface should not be used by the application to access flags for the purpose of controlling application
   * flow. It is intended for monitoring, analytics, or debugging purposes.
   */
  interface LDInspectionIdentifyHandler {
    type: 'client-identity-changed',

    /**
     * Name of the inspector. Will be used for logging issues with the inspector.
     */
    name: string,
  
    /**
     * This method will be called when an identify operation completes.
     */
    method: (user: LDUser) => void;
  }

  type LDInspection = LDInspectionFlagUsedHandler | LDInspectionFlagDetailsChangedHandler
    | LDInspectionFlagDetailChangedHandler | LDInspectionIdentifyHandler;
}
