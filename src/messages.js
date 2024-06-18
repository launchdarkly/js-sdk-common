const errors = require('./errors');

function errorString(err) {
  if (err && err.message) {
    return err.message;
  }
  if (typeof err === 'string' || err instanceof String) {
    return err;
  }
  return JSON.stringify(err);
}

const clientInitialized = function() {
  return 'LaunchDarkly client initialized';
};

const docLink =
  ' Please see https://docs.launchdarkly.com/sdk/client-side/javascript#initialize-the-client for instructions on SDK initialization.';

const clientNotReady = function() {
  return 'LaunchDarkly client is not ready';
};

const eventCapacityExceeded = function() {
  return 'Exceeded event queue capacity. Increase capacity to avoid dropping events.';
};

const eventWithoutContext = function() {
  return 'Be sure to call `identify` in the LaunchDarkly client: https://docs.launchdarkly.com/sdk/features/identify#javascript';
};

const invalidContentType = function(contentType) {
  return 'Expected application/json content type but got "' + contentType + '"';
};

const invalidKey = function() {
  return 'Event key must be a string';
};

const localStorageUnavailable = function(err) {
  return 'local storage is unavailable: ' + errorString(err);
};

const networkError = e => 'network error' + (e ? ' (' + e + ')' : '');

// We should remove unknownCustomEventKey in the future - see comments in track() in index.js
const unknownCustomEventKey = function(key) {
  return 'Custom event "' + key + '" does not exist';
};

const environmentNotFound = function() {
  return 'Environment not found. Double check that you specified a valid environment/client-side ID.' + docLink;
};

const environmentNotSpecified = function() {
  return 'No environment/client-side ID was specified.' + docLink;
};

const errorFetchingFlags = function(err) {
  return 'Error fetching flag settings: ' + errorString(err);
};

const contextNotSpecified = function() {
  return 'No context specified.' + docLink;
};

const invalidContext = function() {
  return 'Invalid context specified.' + docLink;
};

const invalidData = function() {
  return 'Invalid data received from LaunchDarkly; connection may have been interrupted';
};

const bootstrapOldFormat = function() {
  return (
    'LaunchDarkly client was initialized with bootstrap data that did not include flag metadata. ' +
    'Events may not be sent correctly.' +
    docLink
  );
};

const bootstrapInvalid = function() {
  return 'LaunchDarkly bootstrap data is not available because the back end could not read the flags.';
};

const deprecated = function(oldName, newName) {
  if (newName) {
    return '"' + oldName + '" is deprecated, please use "' + newName + '"';
  }
  return '"' + oldName + '" is deprecated';
};

const httpErrorMessage = function(status, context, retryMessage) {
  return (
    'Received error ' +
    status +
    (status === 401 ? ' (invalid SDK key)' : '') +
    ' for ' +
    context +
    ' - ' +
    (errors.isHttpErrorRecoverable(status) ? retryMessage : 'giving up permanently')
  );
};

const httpUnavailable = function() {
  return 'Cannot make HTTP requests in this environment.' + docLink;
};

const identifyDisabled = function() {
  return 'identify() has no effect here; it must be called on the main client instance';
};

const streamClosing = function() {
  return 'Closing stream connection';
};

const streamConnecting = function(url) {
  return 'Opening stream connection to ' + url;
};

const streamError = function(err, streamReconnectDelay) {
  return (
    'Error on stream connection: ' +
    errorString(err) +
    ', will continue retrying after ' +
    streamReconnectDelay +
    ' milliseconds.'
  );
};

const unknownOption = name => 'Ignoring unknown config option "' + name + '"';

const unrecoverableStreamError = err => `Error on stream connection ${errorString(err)}, giving up permanently`;

const wrongOptionType = (name, expectedType, actualType) =>
  'Config option "' + name + '" should be of type ' + expectedType + ', got ' + actualType + ', using default value';

const wrongOptionTypeBoolean = (name, actualType) =>
  'Config option "' + name + '" should be a boolean, got ' + actualType + ', converting to boolean';

const optionBelowMinimum = (name, value, minimum) =>
  'Config option "' + name + '" was set to ' + value + ', changing to minimum value of ' + minimum;

const debugPolling = function(url) {
  return 'polling for feature flags at ' + url;
};

const debugStreamPing = function() {
  return 'received ping message from stream';
};

const debugStreamPut = function() {
  return 'received streaming update for all flags';
};

const debugStreamPatch = function(key) {
  return 'received streaming update for flag "' + key + '"';
};

const debugStreamPatchIgnored = function(key) {
  return 'received streaming update for flag "' + key + '" but ignored due to version check';
};

const debugStreamDelete = function(key) {
  return 'received streaming deletion for flag "' + key + '"';
};

const debugStreamDeleteIgnored = function(key) {
  return 'received streaming deletion for flag "' + key + '" but ignored due to version check';
};

const debugEnqueueingEvent = function(kind) {
  return 'enqueueing "' + kind + '" event';
};

const debugPostingEvents = function(count) {
  return 'sending ' + count + ' events';
};

const debugPostingDiagnosticEvent = function(event) {
  return 'sending diagnostic event (' + event.kind + ')';
};

const invalidInspector = (type, name) => `an inspector: "${name}" of an invalid type (${type}) was configured`;

const inspectorMethodError = (type, name) => `an inspector: "${name}" of type: "${type}" generated an exception`;

const invalidTagValue = name => `Config option "${name}" must only contain letters, numbers, ., _ or -.`;

const tagValueTooLong = name => `Value of "${name}" was longer than 64 characters and was discarded.`;

const invalidMetricValue = badType =>
  `The track function was called with a non-numeric "metricValue" (${badType}), only numeric metric values are supported.`;

module.exports = {
  bootstrapInvalid,
  bootstrapOldFormat,
  clientInitialized,
  clientNotReady,
  debugEnqueueingEvent,
  debugPostingDiagnosticEvent,
  debugPostingEvents,
  debugStreamDelete,
  debugStreamDeleteIgnored,
  debugStreamPatch,
  debugStreamPatchIgnored,
  debugStreamPing,
  debugPolling,
  debugStreamPut,
  deprecated,
  environmentNotFound,
  environmentNotSpecified,
  errorFetchingFlags,
  eventCapacityExceeded,
  eventWithoutContext,
  httpErrorMessage,
  httpUnavailable,
  identifyDisabled,
  inspectorMethodError,
  invalidContentType,
  invalidData,
  invalidInspector,
  invalidKey,
  invalidMetricValue,
  invalidContext,
  invalidTagValue,
  localStorageUnavailable,
  networkError,
  optionBelowMinimum,
  streamClosing,
  streamConnecting,
  streamError,
  tagValueTooLong,
  unknownCustomEventKey,
  unknownOption,
  contextNotSpecified,
  unrecoverableStreamError,
  wrongOptionType,
  wrongOptionTypeBoolean,
};
