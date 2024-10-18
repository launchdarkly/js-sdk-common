const EventProcessor = require('./EventProcessor');
const EventEmitter = require('./EventEmitter');
const EventSender = require('./EventSender');
const InitializationStateTracker = require('./InitializationState');
const PersistentFlagStore = require('./PersistentFlagStore');
const PersistentStorage = require('./PersistentStorage');
const Stream = require('./Stream');
const Requestor = require('./Requestor');
const Identity = require('./Identity');
const AnonymousContextProcessor = require('./AnonymousContextProcessor');
const configuration = require('./configuration');
const diagnostics = require('./diagnosticEvents');
const { commonBasicLogger } = require('./loggers');
const utils = require('./utils');
const errors = require('./errors');
const messages = require('./messages');
const { checkContext, getContextKeys } = require('./context');
const { InspectorTypes, InspectorManager } = require('./InspectorManager');
const timedPromise = require('./timedPromise');

const changeEvent = 'change';
const internalChangeEvent = 'internal-change';
const highTimeoutThreshold = 5;

// This is called by the per-platform initialize functions to create the base client object that we
// may also extend with additional behavior. It returns an object with these properties:
//   client: the actual client object
//   options: the configuration (after any appropriate defaults have been applied)
// If we need to give the platform-specific clients access to any internals here, we should add those
// as properties of the return object, not public properties of the client.
//
// For definitions of the API in the platform object, see stubPlatform.js in the test code.

function initialize(env, context, specifiedOptions, platform, extraOptionDefs) {
  const logger = createLogger();
  const emitter = EventEmitter(logger);
  const initializationStateTracker = InitializationStateTracker(emitter);
  const options = configuration.validate(specifiedOptions, emitter, extraOptionDefs, logger);
  const inspectorManager = InspectorManager(options.inspectors, logger);
  const sendEvents = options.sendEvents;
  let environment = env;
  let hash = options.hash;

  const persistentStorage = PersistentStorage(platform.localStorage, logger);

  const eventSender = EventSender(platform, environment, options);

  const diagnosticsEnabled = options.sendEvents && !options.diagnosticOptOut;
  const diagnosticId = diagnosticsEnabled ? diagnostics.DiagnosticId(environment) : null;
  const diagnosticsAccumulator = diagnosticsEnabled ? diagnostics.DiagnosticsAccumulator(new Date().getTime()) : null;
  const diagnosticsManager = diagnosticsEnabled
    ? diagnostics.DiagnosticsManager(
        platform,
        persistentStorage,
        diagnosticsAccumulator,
        eventSender,
        environment,
        options,
        diagnosticId
      )
    : null;

  const stream = Stream(platform, options, environment, diagnosticsAccumulator);

  const events =
    options.eventProcessor ||
    EventProcessor(platform, options, environment, diagnosticsAccumulator, emitter, eventSender);

  const requestor = Requestor(platform, options, environment);

  let flags = {};
  let useLocalStorage;
  let streamActive;
  let streamForcedState = options.streaming;
  let subscribedToChangeEvents;
  let inited = false;
  let closed = false;
  let firstEvent = true;

  // The "stateProvider" object is used in the Electron SDK, to allow one client instance to take partial
  // control of another. If present, it has the following contract:
  // - getInitialState() returns the initial client state if it is already available. The state is an
  //   object whose properties are "environment", "context", and "flags".
  // - on("init", listener) triggers an event when the initial client state becomes available, passing
  //   the state object to the listener.
  // - on("update", listener) triggers an event when flag values change and/or the current context changes.
  //   The parameter is an object that *may* contain "context" and/or "flags".
  // - enqueueEvent(event) accepts an analytics event object and returns true if the stateProvider will
  //   be responsible for delivering it, or false if we still should deliver it ourselves.
  const stateProvider = options.stateProvider;

  const ident = Identity(null, onIdentifyChange);
  const anonymousContextProcessor = new AnonymousContextProcessor(persistentStorage);
  const persistentFlagStore = persistentStorage.isEnabled()
    ? PersistentFlagStore(persistentStorage, environment, hash, ident, logger)
    : null;

  function createLogger() {
    if (specifiedOptions && specifiedOptions.logger) {
      return specifiedOptions.logger;
    }
    return (extraOptionDefs && extraOptionDefs.logger && extraOptionDefs.logger.default) || commonBasicLogger('warn');
  }

  function readFlagsFromBootstrap(data) {
    // If the bootstrap data came from an older server-side SDK, we'll have just a map of keys to values.
    // Newer SDKs that have an allFlagsState method will provide an extra "$flagsState" key that contains
    // the rest of the metadata we want. We do it this way for backward compatibility with older JS SDKs.
    const keys = Object.keys(data);
    const metadataKey = '$flagsState';
    const validKey = '$valid';
    const metadata = data[metadataKey];
    if (!metadata && keys.length) {
      logger.warn(messages.bootstrapOldFormat());
    }
    if (data[validKey] === false) {
      logger.warn(messages.bootstrapInvalid());
    }
    const ret = {};
    keys.forEach(key => {
      if (key !== metadataKey && key !== validKey) {
        let flag = { value: data[key] };
        if (metadata && metadata[key]) {
          flag = utils.extend(flag, metadata[key]);
        } else {
          flag.version = 0;
        }
        ret[key] = flag;
      }
    });
    return ret;
  }

  function shouldEnqueueEvent() {
    return sendEvents && !closed && !platform.isDoNotTrack();
  }

  function enqueueEvent(event) {
    if (!environment) {
      // We're in paired mode and haven't been initialized with an environment or context yet
      return;
    }
    if (stateProvider && stateProvider.enqueueEvent && stateProvider.enqueueEvent(event)) {
      return; // it'll be handled elsewhere
    }

    if (!event.context) {
      if (firstEvent) {
        logger.warn(messages.eventWithoutContext());
        firstEvent = false;
      }
      return;
    }
    firstEvent = false;

    if (shouldEnqueueEvent()) {
      logger.debug(messages.debugEnqueueingEvent(event.kind));
      events.enqueue(event);
    }
  }

  function notifyInspectionFlagUsed(key, detail) {
    if (inspectorManager.hasListeners(InspectorTypes.flagUsed)) {
      inspectorManager.onFlagUsed(key, detail, ident.getContext());
    }
  }

  function notifyInspectionIdentityChanged() {
    if (inspectorManager.hasListeners(InspectorTypes.clientIdentityChanged)) {
      inspectorManager.onIdentityChanged(ident.getContext());
    }
  }

  function notifyInspectionFlagChanged(data, newFlag) {
    if (inspectorManager.hasListeners(InspectorTypes.flagDetailChanged)) {
      inspectorManager.onFlagChanged(data.key, getFlagDetail(newFlag));
    }
  }

  function notifyInspectionFlagsChanged() {
    if (inspectorManager.hasListeners(InspectorTypes.flagDetailsChanged)) {
      inspectorManager.onFlags(
        Object.entries(flags)
          .map(([key, value]) => ({ key, detail: getFlagDetail(value) }))
          .reduce((acc, cur) => {
            // eslint-disable-next-line no-param-reassign
            acc[cur.key] = cur.detail;
            return acc;
          }, {})
      );
    }
  }

  function onIdentifyChange(context) {
    sendIdentifyEvent(context);
    notifyInspectionIdentityChanged();
  }

  function sendIdentifyEvent(context) {
    if (stateProvider) {
      // In paired mode, the other client is responsible for sending identify events
      return;
    }
    if (context) {
      enqueueEvent({
        kind: 'identify',
        context,
        creationDate: new Date().getTime(),
      });
    }
  }

  function sendFlagEvent(key, detail, defaultValue, includeReason) {
    const context = ident.getContext();
    const now = new Date();
    const value = detail ? detail.value : null;

    const event = {
      kind: 'feature',
      key: key,
      context,
      value: value,
      variation: detail ? detail.variationIndex : null,
      default: defaultValue,
      creationDate: now.getTime(),
    };
    const flag = flags[key];
    if (flag) {
      event.version = flag.flagVersion ? flag.flagVersion : flag.version;
      event.trackEvents = flag.trackEvents;
      event.debugEventsUntilDate = flag.debugEventsUntilDate;
    }
    if ((includeReason || (flag && flag.trackReason)) && detail) {
      event.reason = detail.reason;
    }

    enqueueEvent(event);
  }

  function verifyContext(context) {
    // The context will already have been processed to have a string key, so we
    // do not need to allow for legacy keys in the check.
    if (checkContext(context, false)) {
      return Promise.resolve(context);
    } else {
      return Promise.reject(new errors.LDInvalidUserError(messages.invalidContext()));
    }
  }

  function identify(context, newHash, onDone) {
    if (closed) {
      return utils.wrapPromiseCallback(Promise.resolve({}), onDone);
    }
    if (stateProvider) {
      // We're being controlled by another client instance, so only that instance is allowed to change the context
      logger.warn(messages.identifyDisabled());
      return utils.wrapPromiseCallback(Promise.resolve(utils.transformVersionedValuesToValues(flags)), onDone);
    }
    const clearFirst = useLocalStorage && persistentFlagStore ? persistentFlagStore.clearFlags() : Promise.resolve();
    return utils.wrapPromiseCallback(
      clearFirst
        .then(() => anonymousContextProcessor.processContext(context))
        .then(verifyContext)
        .then(validatedContext =>
          requestor
            .fetchFlagSettings(validatedContext, newHash)
            // the following then() is nested within this one so we can use realUser from the previous closure
            .then(requestedFlags => {
              const flagValueMap = utils.transformVersionedValuesToValues(requestedFlags);
              ident.setContext(validatedContext);
              hash = newHash;
              if (requestedFlags) {
                return replaceAllFlags(requestedFlags).then(() => flagValueMap);
              } else {
                return flagValueMap;
              }
            })
        )
        .then(flagValueMap => {
          if (streamActive) {
            connectStream();
          }
          return flagValueMap;
        })
        .catch(err => {
          emitter.maybeReportError(err);
          return Promise.reject(err);
        }),
      onDone
    );
  }

  function getContext() {
    return ident.getContext();
  }

  function flush(onDone) {
    return utils.wrapPromiseCallback(sendEvents ? events.flush() : Promise.resolve(), onDone);
  }

  function variation(key, defaultValue) {
    return variationDetailInternal(key, defaultValue, true, false, false, true).value;
  }

  function variationDetail(key, defaultValue) {
    return variationDetailInternal(key, defaultValue, true, true, false, true);
  }

  function variationDetailInternal(key, defaultValue, sendEvent, includeReasonInEvent, isAllFlags, notifyInspection) {
    let detail;
    let flag;

    if (flags && utils.objectHasOwnProperty(flags, key) && flags[key] && !flags[key].deleted) {
      flag = flags[key];
      detail = getFlagDetail(flag);
      if (flag.value === null || flag.value === undefined) {
        detail.value = defaultValue;
      }
    } else {
      detail = { value: defaultValue, variationIndex: null, reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' } };
    }

    if (sendEvent) {
      // For an all-flags evaluation, with events enabled, each flag will get an event, so we do not
      // need to duplicate the prerequisites.
      if (!isAllFlags) {
        flag?.prerequisites?.forEach(key => {
          variationDetailInternal(key, undefined, sendEvent, false, false, false);
        });
      }
      sendFlagEvent(key, detail, defaultValue, includeReasonInEvent);
    }

    // For the all flags case `onFlags` will be called instead.
    if (!isAllFlags && notifyInspection) {
      notifyInspectionFlagUsed(key, detail);
    }

    return detail;
  }

  function getFlagDetail(flag) {
    return {
      value: flag.value,
      variationIndex: flag.variation === undefined ? null : flag.variation,
      reason: flag.reason || null,
    };
    // Note, the logic above ensures that variationIndex and reason will always be null rather than
    // undefined if we don't have values for them. That's just to avoid subtle errors that depend on
    // whether an object was JSON-encoded with null properties omitted or not.
  }

  function allFlags() {
    const results = {};

    if (!flags) {
      return results;
    }

    for (const key in flags) {
      if (utils.objectHasOwnProperty(flags, key) && !flags[key].deleted) {
        results[key] = variationDetailInternal(
          key,
          null,
          !options.sendEventsOnlyForVariation,
          false,
          true,
          false
        ).value;
      }
    }

    return results;
  }

  function userContextKind(user) {
    return user.anonymous ? 'anonymousUser' : 'user';
  }

  function track(key, data, metricValue) {
    if (typeof key !== 'string') {
      emitter.maybeReportError(new errors.LDInvalidEventKeyError(messages.unknownCustomEventKey(key)));
      return;
    }
    if (metricValue !== undefined && typeof metricValue !== 'number') {
      logger.warn(messages.invalidMetricValue(typeof metricValue));
    }

    // The following logic was used only for the JS browser SDK (js-client-sdk) and
    // is no longer needed as of version 2.9.13 of that SDK. The other client-side
    // JS-based SDKs did not define customEventFilter, and now none of them do. We
    // can remove this in the next major version of the common code, when it's OK to
    // make breaking changes to our internal API contracts.
    if (platform.customEventFilter && !platform.customEventFilter(key)) {
      logger.warn(messages.unknownCustomEventKey(key));
    }

    const context = ident.getContext();
    const e = {
      kind: 'custom',
      key: key,
      context,
      url: platform.getCurrentUrl(),
      creationDate: new Date().getTime(),
    };
    if (context && context.anonymous) {
      e.contextKind = userContextKind(context);
    }
    // Note, check specifically for null/undefined because it is legal to set these fields to a falsey value.
    if (data !== null && data !== undefined) {
      e.data = data;
    }
    if (metricValue !== null && metricValue !== undefined) {
      e.metricValue = metricValue;
    }
    enqueueEvent(e);
  }

  function connectStream() {
    streamActive = true;
    if (!ident.getContext()) {
      return;
    }
    const tryParseData = jsonData => {
      try {
        return JSON.parse(jsonData);
      } catch (err) {
        emitter.maybeReportError(new errors.LDInvalidDataError(messages.invalidData()));
        return undefined;
      }
    };
    stream.connect(ident.getContext(), hash, {
      ping: function() {
        logger.debug(messages.debugStreamPing());
        const contextAtTimeOfPingEvent = ident.getContext();
        requestor
          .fetchFlagSettings(contextAtTimeOfPingEvent, hash)
          .then(requestedFlags => {
            // Check whether the current context is still the same - we don't want to overwrite the flags if
            // the application has called identify() while this request was in progress
            if (utils.deepEquals(contextAtTimeOfPingEvent, ident.getContext())) {
              replaceAllFlags(requestedFlags || {});
            }
          })
          .catch(err => {
            emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
          });
      },
      put: function(e) {
        const data = tryParseData(e.data);
        if (!data) {
          return;
        }
        logger.debug(messages.debugStreamPut());
        replaceAllFlags(data);
        // Don't wait for this Promise to be resolved; note that replaceAllFlags is guaranteed
        // never to have an unhandled rejection
      },
      patch: function(e) {
        const data = tryParseData(e.data);
        if (!data) {
          return;
        }
        // If both the flag and the patch have a version property, then the patch version must be
        // greater than the flag version for us to accept the patch.  If either one has no version
        // then the patch always succeeds.
        const oldFlag = flags[data.key];
        if (!oldFlag || !oldFlag.version || !data.version || oldFlag.version < data.version) {
          logger.debug(messages.debugStreamPatch(data.key));
          const mods = {};
          const newFlag = utils.extend({}, data);
          delete newFlag['key'];
          flags[data.key] = newFlag;
          const newDetail = getFlagDetail(newFlag);
          if (oldFlag) {
            mods[data.key] = { previous: oldFlag.value, current: newDetail };
          } else {
            mods[data.key] = { current: newDetail };
          }
          notifyInspectionFlagChanged(data, newFlag);
          handleFlagChanges(mods); // don't wait for this Promise to be resolved
        } else {
          logger.debug(messages.debugStreamPatchIgnored(data.key));
        }
      },
      delete: function(e) {
        const data = tryParseData(e.data);
        if (!data) {
          return;
        }
        if (!flags[data.key] || flags[data.key].version < data.version) {
          logger.debug(messages.debugStreamDelete(data.key));
          const mods = {};
          if (flags[data.key] && !flags[data.key].deleted) {
            mods[data.key] = { previous: flags[data.key].value };
          }
          flags[data.key] = { version: data.version, deleted: true };
          notifyInspectionFlagChanged(data, flags[data.key]);
          handleFlagChanges(mods); // don't wait for this Promise to be resolved
        } else {
          logger.debug(messages.debugStreamDeleteIgnored(data.key));
        }
      },
    });
  }

  function disconnectStream() {
    if (streamActive) {
      stream.disconnect();
      streamActive = false;
    }
  }

  // Returns a Promise which will be resolved when we have completely updated the internal flags state,
  // dispatched all change events, and updated local storage if appropriate. This Promise is guaranteed
  // never to have an unhandled rejection.
  function replaceAllFlags(newFlags) {
    const changes = {};

    if (!newFlags) {
      return Promise.resolve();
    }

    for (const key in flags) {
      if (utils.objectHasOwnProperty(flags, key) && flags[key]) {
        if (newFlags[key] && !utils.deepEquals(newFlags[key].value, flags[key].value)) {
          changes[key] = { previous: flags[key].value, current: getFlagDetail(newFlags[key]) };
        } else if (!newFlags[key] || newFlags[key].deleted) {
          changes[key] = { previous: flags[key].value };
        }
      }
    }
    for (const key in newFlags) {
      if (utils.objectHasOwnProperty(newFlags, key) && newFlags[key] && (!flags[key] || flags[key].deleted)) {
        changes[key] = { current: getFlagDetail(newFlags[key]) };
      }
    }

    flags = { ...newFlags };

    notifyInspectionFlagsChanged();

    return handleFlagChanges(changes).catch(() => {}); // swallow any exceptions from this Promise
  }

  // Returns a Promise which will be resolved when we have dispatched all change events and updated
  // local storage if appropriate.
  function handleFlagChanges(changes) {
    const keys = Object.keys(changes);

    if (keys.length > 0) {
      const changeEventParams = {};
      keys.forEach(key => {
        const current = changes[key].current;
        const value = current ? current.value : undefined;
        const previous = changes[key].previous;
        emitter.emit(changeEvent + ':' + key, value, previous);
        changeEventParams[key] = current ? { current: value, previous: previous } : { previous: previous };
      });

      emitter.emit(changeEvent, changeEventParams);
      emitter.emit(internalChangeEvent, flags);

      // By default, we send feature evaluation events whenever we have received new flag values -
      // the client has in effect evaluated these flags just by receiving them. This can be suppressed
      // by setting "sendEventsOnlyForVariation". Also, if we have a stateProvider, we don't send these
      // events because we assume they have already been sent by the other client that gave us the flags
      // (when it received them in the first place).
      if (!options.sendEventsOnlyForVariation && !stateProvider) {
        keys.forEach(key => {
          sendFlagEvent(key, changes[key].current);
        });
      }
    }

    if (useLocalStorage && persistentFlagStore) {
      return persistentFlagStore.saveFlags(flags);
    } else {
      return Promise.resolve();
    }
  }

  function on(event, handler, context) {
    if (isChangeEventKey(event)) {
      subscribedToChangeEvents = true;
      if (inited) {
        updateStreamingState();
      }
      emitter.on(event, handler, context);
    } else {
      emitter.on(...arguments);
    }
  }

  function off(event) {
    emitter.off(...arguments);
    if (isChangeEventKey(event)) {
      let haveListeners = false;
      emitter.getEvents().forEach(key => {
        if (isChangeEventKey(key) && emitter.getEventListenerCount(key) > 0) {
          haveListeners = true;
        }
      });
      if (!haveListeners) {
        subscribedToChangeEvents = false;
        if (streamActive && streamForcedState === undefined) {
          disconnectStream();
        }
      }
    }
  }

  function setStreaming(state) {
    const newState = state === null ? undefined : state;
    if (newState !== streamForcedState) {
      streamForcedState = newState;
      updateStreamingState();
    }
  }

  function updateStreamingState() {
    const shouldBeStreaming = streamForcedState || (subscribedToChangeEvents && streamForcedState === undefined);
    if (shouldBeStreaming && !streamActive) {
      connectStream();
    } else if (!shouldBeStreaming && streamActive) {
      disconnectStream();
    }
    if (diagnosticsManager) {
      diagnosticsManager.setStreaming(shouldBeStreaming);
    }
  }

  function isChangeEventKey(event) {
    return event === changeEvent || event.substr(0, changeEvent.length + 1) === changeEvent + ':';
  }

  if (typeof options.bootstrap === 'string' && options.bootstrap.toUpperCase() === 'LOCALSTORAGE') {
    if (persistentFlagStore) {
      useLocalStorage = true;
    } else {
      logger.warn(messages.localStorageUnavailable());
    }
  }

  if (typeof options.bootstrap === 'object') {
    // Set the flags as soon as possible before we get into any async code, so application code can read
    // them even if the ready event has not yet fired.
    flags = readFlagsFromBootstrap(options.bootstrap);
  }

  if (stateProvider) {
    // The stateProvider option is used in the Electron SDK, to allow a client instance in the main process
    // to control another client instance (i.e. this one) in the renderer process. We can't predict which
    // one will start up first, so the initial state may already be available for us or we may have to wait
    // to receive it.
    const state = stateProvider.getInitialState();
    if (state) {
      initFromStateProvider(state);
    } else {
      stateProvider.on('init', initFromStateProvider);
    }
    stateProvider.on('update', updateFromStateProvider);
  } else {
    finishInit().catch(signalFailedInit);
  }

  function finishInit() {
    if (!env) {
      return Promise.reject(new errors.LDInvalidEnvironmentIdError(messages.environmentNotSpecified()));
    }
    return anonymousContextProcessor
      .processContext(context)
      .then(verifyContext)
      .then(validatedContext => {
        ident.setContext(validatedContext);
        if (typeof options.bootstrap === 'object') {
          // flags have already been set earlier
          return signalSuccessfulInit();
        } else if (useLocalStorage) {
          return finishInitWithLocalStorage();
        } else {
          return finishInitWithPolling();
        }
      });
  }

  function finishInitWithLocalStorage() {
    return persistentFlagStore.loadFlags().then(storedFlags => {
      if (storedFlags === null || storedFlags === undefined) {
        flags = {};
        return requestor
          .fetchFlagSettings(ident.getContext(), hash)
          .then(requestedFlags => replaceAllFlags(requestedFlags || {}))
          .then(signalSuccessfulInit)
          .catch(err => {
            const initErr = new errors.LDFlagFetchError(messages.errorFetchingFlags(err));
            signalFailedInit(initErr);
          });
      } else {
        // We're reading the flags from local storage. Signal that we're ready,
        // then update localStorage for the next page load. We won't signal changes or update
        // the in-memory flags unless you subscribe for changes
        flags = storedFlags;
        utils.onNextTick(signalSuccessfulInit);

        return requestor
          .fetchFlagSettings(ident.getContext(), hash)
          .then(requestedFlags => replaceAllFlags(requestedFlags))
          .catch(err => emitter.maybeReportError(err));
      }
    });
  }

  function finishInitWithPolling() {
    return requestor
      .fetchFlagSettings(ident.getContext(), hash)
      .then(requestedFlags => {
        flags = requestedFlags || {};

        notifyInspectionFlagsChanged();
        // Note, we don't need to call updateSettings here because local storage and change events are not relevant
        signalSuccessfulInit();
      })
      .catch(err => {
        flags = {};
        signalFailedInit(err);
      });
  }

  function initFromStateProvider(state) {
    environment = state.environment;
    ident.setContext(state.context);
    flags = { ...state.flags };
    utils.onNextTick(signalSuccessfulInit);
  }

  function updateFromStateProvider(state) {
    if (state.context) {
      ident.setContext(state.context);
    }
    if (state.flags) {
      replaceAllFlags(state.flags); // don't wait for this Promise to be resolved
    }
  }

  function signalSuccessfulInit() {
    logger.info(messages.clientInitialized());
    inited = true;
    updateStreamingState();
    initializationStateTracker.signalSuccess();
  }

  function signalFailedInit(err) {
    initializationStateTracker.signalFailure(err);
  }

  function start() {
    if (sendEvents) {
      if (diagnosticsManager) {
        diagnosticsManager.start();
      }
      events.start();
    }
  }

  function close(onDone) {
    if (closed) {
      return utils.wrapPromiseCallback(Promise.resolve(), onDone);
    }
    const finishClose = () => {
      closed = true;
      flags = {};
    };
    const p = Promise.resolve()
      .then(() => {
        disconnectStream();
        if (diagnosticsManager) {
          diagnosticsManager.stop();
        }
        if (sendEvents) {
          events.stop();
          return events.flush();
        }
      })
      .then(finishClose)
      .catch(finishClose);
    return utils.wrapPromiseCallback(p, onDone);
  }

  function getFlagsInternal() {
    // used by Electron integration
    return flags;
  }

  function waitForInitializationWithTimeout(timeout) {
    if (timeout > highTimeoutThreshold) {
      logger.warn(
        'The waitForInitialization function was called with a timeout greater than ' +
          `${highTimeoutThreshold} seconds. We recommend a timeout of ` +
          `${highTimeoutThreshold} seconds or less.`
      );
    }

    const initPromise = initializationStateTracker.getInitializationPromise();
    const timeoutPromise = timedPromise(timeout, 'waitForInitialization');

    return Promise.race([timeoutPromise, initPromise]).catch(e => {
      if (e instanceof errors.LDTimeoutError) {
        logger.error(`waitForInitialization error: ${e}`);
      }
      throw e;
    });
  }

  function waitForInitialization(timeout = undefined) {
    if (timeout !== undefined && timeout !== null) {
      if (typeof timeout === 'number') {
        return waitForInitializationWithTimeout(timeout);
      }
      logger.warn('The waitForInitialization method was provided with a non-numeric timeout.');
    }
    logger.warn(
      'The waitForInitialization function was called without a timeout specified.' +
        ' In a future version a default timeout will be applied.'
    );
    return initializationStateTracker.getInitializationPromise();
  }

  const client = {
    waitForInitialization,
    waitUntilReady: () => initializationStateTracker.getReadyPromise(),
    identify: identify,
    getContext: getContext,
    variation: variation,
    variationDetail: variationDetail,
    track: track,
    on: on,
    off: off,
    setStreaming: setStreaming,
    flush: flush,
    allFlags: allFlags,
    close: close,
  };

  return {
    client: client, // The client object containing all public methods.
    options: options, // The validated configuration object, including all defaults.
    emitter: emitter, // The event emitter which can be used to log errors or trigger events.
    ident: ident, // The Identity object that manages the current context.
    logger: logger, // The logging abstraction.
    requestor: requestor, // The Requestor object.
    start: start, // Starts the client once the environment is ready.
    enqueueEvent: enqueueEvent, // Puts an analytics event in the queue, if event sending is enabled.
    getFlagsInternal: getFlagsInternal, // Returns flag data structure with all details.
    getEnvironmentId: () => environment, // Gets the environment ID (this may have changed since initialization, if we have a state provider)
    internalChangeEventName: internalChangeEvent, // This event is triggered whenever we have new flag state.
  };
}

module.exports = {
  initialize,
  commonBasicLogger,
  errors,
  messages,
  utils,
  getContextKeys,
};
