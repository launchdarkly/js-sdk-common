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
  ' Please see https://docs.launchdarkly.com/sdk/client-side/javascript#initializing-the-client for instructions on SDK initialization.';

const clientNotReady = function() {
  return 'LaunchDarkly client is not ready';
};

const eventCapacityExceeded = function() {
  return 'Exceeded event queue capacity. Increase capacity to avoid dropping events.';
};

const eventWithoutUser = function() {
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

const userNotSpecified = function() {
  return 'No user specified.' + docLink;
};

const invalidUser = function() {
  return 'Invalid user specified.' + docLink;
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
    ', will continue retrying every ' +
    streamReconnectDelay +
    ' milliseconds.'
  );
};

const unknownOption = name => 'Ignoring unknown config option "' + name + '"';

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
  eventWithoutUser,
  httpErrorMessage,
  httpUnavailable,
  identifyDisabled,
  invalidContentType,
  invalidKey,
  invalidUser,
  localStorageUnavailable,
  networkError,
  optionBelowMinimum,
  streamClosing,
  streamConnecting,
  streamError,
  unknownCustomEventKey,
  unknownOption,
  userNotSpecified,
  wrongOptionType,
  wrongOptionTypeBoolean,
};
