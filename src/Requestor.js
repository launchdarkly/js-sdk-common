const utils = require('./utils');
const errors = require('./errors');
const messages = require('./messages');
const promiseCoalescer = require('./promiseCoalescer');
const { transformHeaders, getLDHeaders } = require('./headers');

const jsonContentType = 'application/json';

function getResponseError(result) {
  if (result.status === 404) {
    return new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound());
  } else {
    return new errors.LDFlagFetchError(messages.errorFetchingFlags(result.statusText || String(result.status)));
  }
}

function Requestor(platform, options, environment) {
  const baseUrl = options.baseUrl;
  const useReport = options.useReport;
  const withReasons = options.evaluationReasons;
  const logger = options.logger;

  const requestor = {};

  const activeRequests = {}; // map of URLs to promiseCoalescers

  function fetchJSON(endpoint, body) {
    if (!platform.httpRequest) {
      return new Promise((resolve, reject) => {
        reject(new errors.LDFlagFetchError(messages.httpUnavailable()));
      });
    }

    const method = body ? 'REPORT' : 'GET';
    const headers = getLDHeaders(platform, options);
    if (body) {
      headers['Content-Type'] = jsonContentType;
    }

    let coalescer = activeRequests[endpoint];
    if (!coalescer) {
      coalescer = promiseCoalescer(() => {
        // this will be called once there are no more active requests for the same endpoint
        delete activeRequests[endpoint];
      });
      activeRequests[endpoint] = coalescer;
    }

    const req = platform.httpRequest(method, endpoint, transformHeaders(headers, options), body);
    const p = req.promise.then(
      result => {
        if (result.status === 200) {
          // We're using substring here because using startsWith would require a polyfill in IE.
          if (
            result.header('content-type') &&
            result.header('content-type').substring(0, jsonContentType.length) === jsonContentType
          ) {
            return JSON.parse(result.body);
          } else {
            const message = messages.invalidContentType(result.header('content-type') || '');
            return Promise.reject(new errors.LDFlagFetchError(message));
          }
        } else {
          return Promise.reject(getResponseError(result));
        }
      },
      e => Promise.reject(new errors.LDFlagFetchError(messages.networkError(e)))
    );
    coalescer.addPromise(p, () => {
      // this will be called if another request for the same endpoint supersedes this one
      req.cancel && req.cancel();
    });
    return coalescer.resultPromise;
  }

  // Performs a GET request to an arbitrary path under baseUrl. Returns a Promise which will resolve
  // with the parsed JSON response, or will be rejected if the request failed.
  requestor.fetchJSON = function(path) {
    return fetchJSON(utils.appendUrlPath(baseUrl, path), null);
  };

  // Requests the current state of all flags for the given context from LaunchDarkly. Returns a Promise
  // which will resolve with the parsed JSON response, or will be rejected if the request failed.
  requestor.fetchFlagSettings = function(context, hash) {
    let data;
    let endpoint;
    let query = '';
    let body;

    if (useReport) {
      endpoint = [baseUrl, '/sdk/evalx/', environment, '/context'].join('');
      body = JSON.stringify(context);
    } else {
      data = utils.base64URLEncode(JSON.stringify(context));
      endpoint = [baseUrl, '/sdk/evalx/', environment, '/contexts/', data].join('');
    }
    if (hash) {
      query = 'h=' + hash;
    }
    if (withReasons) {
      query = query + (query ? '&' : '') + 'withReasons=true';
    }
    endpoint = endpoint + (query ? '?' : '') + query;
    logger.debug(messages.debugPolling(endpoint));

    return fetchJSON(endpoint, body);
  };

  return requestor;
}

module.exports = Requestor;
