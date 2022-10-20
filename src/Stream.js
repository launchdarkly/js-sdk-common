const messages = require('./messages');
const { appendUrlPath, base64URLEncode, objectHasOwnProperty } = require('./utils');
const { getLDHeaders, transformHeaders } = require('./headers');
const { isHttpErrorRecoverable } = require('./errors');

// The underlying event source implementation is abstracted via the platform object, which should
// have these three properties:
// eventSourceFactory(): a function that takes a URL and optional config object and returns an object
//   with the same methods as the regular HTML5 EventSource object. The properties in the config
//   object are those supported by the launchdarkly-eventsource package; browser EventSource
//   implementations don't have any config options.
// eventSourceIsActive(): a function that takes an EventSource-compatible object and returns true if
//   it is in an active state (connected or connecting).
// eventSourceAllowsReport: true if REPORT is supported.

// The read timeout for the stream is a fixed value that is set to be slightly longer than the expected
// interval between heartbeats from the LaunchDarkly streaming server. If this amount of time elapses
// with no new data, the connection will be cycled.
const streamReadTimeoutMillis = 5 * 60 * 1000; // 5 minutes
const maxRetryDelay = 30 * 1000; // Maximum retry delay 30 seconds.
const jitterRatio = 0.5; // Delay should be 50%-100% of calculated time.

function Stream(platform, config, environment, diagnosticsAccumulator) {
  const baseUrl = config.streamUrl;
  const logger = config.logger;
  const stream = {};
  const evalUrlPrefix = appendUrlPath(baseUrl, '/eval/' + environment);
  const useReport = config.useReport;
  const withReasons = config.evaluationReasons;
  const baseReconnectDelay = config.streamReconnectDelay;
  const headers = getLDHeaders(platform, config);
  let firstConnectionErrorLogged = false;
  let es = null;
  let reconnectTimeoutReference = null;
  let connectionAttemptStartTime;
  let context = null;
  let hash = null;
  let handlers = null;
  let retryCount = 0;

  function backoff() {
    const delay = baseReconnectDelay * Math.pow(2, retryCount);
    return delay > maxRetryDelay ? maxRetryDelay : delay;
  }

  function jitter(computedDelayMillis) {
    return computedDelayMillis - Math.trunc(Math.random() * jitterRatio * computedDelayMillis);
  }

  function getNextRetryDelay() {
    const delay = jitter(backoff());
    retryCount += 1;
    return delay;
  }

  stream.connect = function(newContext, newHash, newHandlers) {
    context = newContext;
    hash = newHash;
    handlers = {};
    for (const key in newHandlers || {}) {
      handlers[key] = function(e) {
        // Reset the state for logging the first connection error so that the first
        // connection error following a successful connection will once again be logged.
        // We will decorate *all* handlers to do this to keep this abstraction agnostic
        // for different stream implementations.
        firstConnectionErrorLogged = false;
        logConnectionResult(true);
        newHandlers[key] && newHandlers[key](e);
      };
    }
    tryConnect();
  };

  stream.disconnect = function() {
    clearTimeout(reconnectTimeoutReference);
    reconnectTimeoutReference = null;
    closeConnection();
  };

  stream.isConnected = function() {
    return !!(es && platform.eventSourceIsActive && platform.eventSourceIsActive(es));
  };

  function handleError(err) {
    // The event source may not produce a status. But the LaunchDarkly
    // polyfill can. If we can get the status, then we should stop retrying
    // on certain error codes.
    if (err.status && typeof err.status === 'number' && !isHttpErrorRecoverable(err.status)) {
      // If we encounter an unrecoverable condition, then we do not want to
      // retry anymore.
      closeConnection();
      logger.error(messages.unrecoverableStreamError(err));
      // Ensure any pending retry attempts are not done.
      if (reconnectTimeoutReference) {
        clearTimeout(reconnectTimeoutReference);
        reconnectTimeoutReference = null;
      }
      return;
    }

    const delay = getNextRetryDelay();

    if (!firstConnectionErrorLogged) {
      logger.warn(messages.streamError(err, delay));
      firstConnectionErrorLogged = true;
    }
    logConnectionResult(false);
    closeConnection();
    tryConnect(delay);
  }

  function tryConnect(delay) {
    if (!reconnectTimeoutReference) {
      if (delay) {
        reconnectTimeoutReference = setTimeout(openConnection, delay);
      } else {
        openConnection();
      }
    }
  }

  function openConnection() {
    reconnectTimeoutReference = null;
    let url;
    let query = '';
    const options = { headers, readTimeoutMillis: streamReadTimeoutMillis };
    if (platform.eventSourceFactory) {
      if (hash !== null && hash !== undefined) {
        query = 'h=' + hash;
      }
      if (useReport) {
        if (platform.eventSourceAllowsReport) {
          url = evalUrlPrefix;
          options.method = 'REPORT';
          options.headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(context);
        } else {
          // if we can't do REPORT, fall back to the old ping-based stream
          url = appendUrlPath(baseUrl, '/ping/' + environment);
          query = '';
        }
      } else {
        url = evalUrlPrefix + '/' + base64URLEncode(JSON.stringify(context));
      }
      options.headers = transformHeaders(options.headers, config);
      if (withReasons) {
        query = query + (query ? '&' : '') + 'withReasons=true';
      }
      url = url + (query ? '?' : '') + query;

      closeConnection();
      logger.info(messages.streamConnecting(url));
      logConnectionStarted();

      es = platform.eventSourceFactory(url, options);
      for (const key in handlers) {
        if (objectHasOwnProperty(handlers, key)) {
          es.addEventListener(key, handlers[key]);
        }
      }

      es.onerror = handleError;

      es.onopen = () => {
        // If the connection is a success, then reset the retryCount.
        retryCount = 0;
      };
    }
  }

  function closeConnection() {
    if (es) {
      logger.info(messages.streamClosing());
      es.close();
      es = null;
    }
  }

  function logConnectionStarted() {
    connectionAttemptStartTime = new Date().getTime();
  }

  function logConnectionResult(success) {
    if (connectionAttemptStartTime && diagnosticsAccumulator) {
      diagnosticsAccumulator.recordStreamInit(
        connectionAttemptStartTime,
        !success,
        new Date().getTime() - connectionAttemptStartTime
      );
    }
    connectionAttemptStartTime = null;
  }

  return stream;
}

module.exports = Stream;
