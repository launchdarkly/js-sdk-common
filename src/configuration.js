import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

// baseOptionDefs should contain an entry for each supported configuration option in the common package.
// Each entry can have two properties: "default" (the default value if any), and "type" (a type
// constraint used if the type can't be inferred from the default value). The allowable values for
// "type" are "boolean", "string", "number", "array", "object", "function", or several of these OR'd
// together with "|" ("function|object").
//
// The extraOptions parameter to validate() uses the same format.
export const baseOptionDefs = {
  baseUrl: { default: 'https://app.launchdarkly.com' },
  streamUrl: { default: 'https://clientstream.launchdarkly.com' },
  eventsUrl: { default: 'https://events.launchdarkly.com' },
  sendEvents: { default: true },
  sendLDHeaders: { default: true },
  inlineUsersInEvents: { default: false },
  allowFrequentDuplicateEvents: { default: false },
  sendEventsOnlyForVariation: { default: false },
  useReport: { default: false },
  evaluationReasons: { default: false },
  eventCapacity: { default: 100 },
  flushInterval: { default: 2000 },
  samplingInterval: { default: 0 },
  streamReconnectDelay: { default: 1000 },
  allAttributesPrivate: { default: false },
  privateAttributeNames: { default: [] },
  bootstrap: { type: 'string|object' },
  stateProvider: { type: 'object' }, // not a public option, used internally
};

export function validate(options, emitter, extraOptionDefs, logger) {
  const optionDefs = utils.extend({ logger: { default: logger } }, baseOptionDefs, extraOptionDefs);

  const deprecatedOptions = {
    // eslint-disable-next-line camelcase
    all_attributes_private: 'allAttributesPrivate',
    // eslint-disable-next-line camelcase
    private_attribute_names: 'privateAttributeNames',
    samplingInterval: null,
  };

  function checkDeprecatedOptions(config) {
    const opts = config;
    Object.keys(deprecatedOptions).forEach(oldName => {
      if (opts[oldName] !== undefined) {
        const newName = deprecatedOptions[oldName];
        logger && logger.warn(messages.deprecated(oldName, newName));
        if (newName) {
          if (opts[newName] === undefined) {
            opts[newName] = opts[oldName];
          }
          delete opts[oldName];
        }
      }
    });
  }

  function applyDefaults(config) {
    // This works differently from utils.extend() in that it *will not* override a default value
    // if the provided value is explicitly set to null. This provides backward compatibility
    // since in the past we only used the provided values if they were truthy.
    const ret = utils.extend({}, config);
    Object.keys(optionDefs).forEach(name => {
      if (ret[name] === undefined || ret[name] === null) {
        ret[name] = optionDefs[name] && optionDefs[name].default;
      }
    });
    return ret;
  }

  function validateTypesAndNames(config) {
    const ret = utils.extend({}, config);
    const typeDescForValue = value => {
      if (value === null) {
        return 'any';
      }
      if (value === undefined) {
        return undefined;
      }
      if (Array.isArray(value)) {
        return 'array';
      }
      const t = typeof value;
      if (t === 'boolean' || t === 'string' || t === 'number') {
        return t;
      }
      return 'object';
    };
    Object.keys(config).forEach(name => {
      const value = config[name];
      if (value !== null && value !== undefined) {
        const optionDef = optionDefs[name];
        if (optionDef === undefined) {
          reportArgumentError(messages.unknownOption(name));
        } else {
          const expectedType = optionDef.type || typeDescForValue(optionDef.default);
          if (expectedType !== 'any') {
            const allowedTypes = expectedType.split('|');
            const actualType = typeDescForValue(value);
            if (allowedTypes.indexOf(actualType) < 0) {
              if (expectedType === 'boolean') {
                ret[name] = !!value;
                reportArgumentError(messages.wrongOptionTypeBoolean(name, actualType));
              } else {
                reportArgumentError(messages.wrongOptionType(name, expectedType, actualType));
                ret[name] = optionDef.default;
              }
            }
          }
        }
      }
    });
    return ret;
  }

  function reportArgumentError(message) {
    utils.onNextTick(() => {
      emitter && emitter.maybeReportError(new errors.LDInvalidArgumentError(message));
    });
  }

  let config = utils.extend({}, options || {});

  checkDeprecatedOptions(config);

  config = applyDefaults(config);
  config = validateTypesAndNames(config);

  if (config.eventCapacity < 1) {
    config.eventCapacity = optionDefs.eventCapacity.default;
    reportArgumentError('Invalid eventCapacity configured. Must be an integer > 0.');
  }
  if (config.flushInterval < 2000) {
    config.flushInterval = optionDefs.flushInterval.default;
    reportArgumentError('Invalid flush interval configured. Must be an integer >= 2000 (milliseconds).');
  }
  if (config.samplingInterval < 0) {
    config.samplingInterval = 0;
    reportArgumentError('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
  }

  return config;
}
