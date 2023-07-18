const base64 = require('base64-js');
const fastDeepEqual = require('fast-deep-equal');

const userAttrsToStringify = ['key', 'ip', 'country', 'email', 'firstName', 'lastName', 'avatar', 'name'];

function appendUrlPath(baseUrl, path) {
  // Ensure that URL concatenation is done correctly regardless of whether the
  // base URL has a trailing slash or not.
  const trimBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
  return trimBaseUrl + (path.startsWith('/') ? '' : '/') + path;
}

// See http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
function btoa(s) {
  const escaped = unescape(encodeURIComponent(s));
  return base64.fromByteArray(stringToBytes(escaped));
}

function stringToBytes(s) {
  const b = [];
  for (let i = 0; i < s.length; i++) {
    b.push(s.charCodeAt(i));
  }
  return b;
}

function base64URLEncode(s) {
  return (
    btoa(s)
      // eslint-disable-next-line
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  );
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepEquals(a, b) {
  return fastDeepEqual(a, b);
}

// Events emitted in LDClient's initialize method will happen before the consumer
// can register a listener, so defer them to next tick.
function onNextTick(cb) {
  setTimeout(cb, 0);
}

/**
 * Wrap a promise to invoke an optional callback upon resolution or rejection.
 *
 * This function assumes the callback follows the Node.js callback type: (err, value) => void
 *
 * If a callback is provided:
 *   - if the promise is resolved, invoke the callback with (null, value)
 *   - if the promise is rejected, invoke the callback with (error, null)
 *
 * @param {Promise<any>} promise
 * @param {Function} callback
 * @returns Promise<any> | undefined
 */
function wrapPromiseCallback(promise, callback) {
  const ret = promise.then(
    value => {
      if (callback) {
        setTimeout(() => {
          callback(null, value);
        }, 0);
      }
      return value;
    },
    error => {
      if (callback) {
        setTimeout(() => {
          callback(error, null);
        }, 0);
      } else {
        return Promise.reject(error);
      }
    }
  );

  return !callback ? ret : undefined;
}

/**
 * Takes a map of flag keys to values, and returns the more verbose structure used by the
 * client stream.
 */
function transformValuesToVersionedValues(flags) {
  const ret = {};
  for (const key in flags) {
    if (objectHasOwnProperty(flags, key)) {
      ret[key] = { value: flags[key], version: 0 };
    }
  }
  return ret;
}

/**
 * Converts the internal flag state map to a simple map of flag keys to values.
 */
function transformVersionedValuesToValues(flagsState) {
  const ret = {};
  for (const key in flagsState) {
    if (objectHasOwnProperty(flagsState, key)) {
      ret[key] = flagsState[key].value;
    }
  }
  return ret;
}

function getLDUserAgentString(platform) {
  const version = platform.version || '?';
  return platform.userAgent + '/' + version;
}

function extend(...objects) {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
}

function objectHasOwnProperty(object, name) {
  return Object.prototype.hasOwnProperty.call(object, name);
}

function sanitizeContext(context) {
  if (!context) {
    return context;
  }
  let newContext;
  // Only stringify user attributes for legacy users.
  if (context.kind === null || context.kind === undefined) {
    userAttrsToStringify.forEach(attr => {
      const value = context[attr];
      if (value !== undefined && typeof value !== 'string') {
        newContext = newContext || { ...context };
        newContext[attr] = String(value);
      }
    });
  }

  return newContext || context;
}

module.exports = {
  appendUrlPath,
  base64URLEncode,
  btoa,
  clone,
  deepEquals,
  extend,
  getLDUserAgentString,
  objectHasOwnProperty,
  onNextTick,
  sanitizeContext,
  transformValuesToVersionedValues,
  transformVersionedValuesToValues,
  wrapPromiseCallback,
};
