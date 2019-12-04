import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

export const baseDefaults = {
  baseUrl: 'https://app.launchdarkly.com',
  streamUrl: 'https://clientstream.launchdarkly.com',
  eventsUrl: 'https://events.launchdarkly.com',
  sendEvents: true,
  sendLDHeaders: true,
  inlineUsersInEvents: false,
  allowFrequentDuplicateEvents: false,
  sendEventsOnlyForVariation: false,
  useReport: false,
  evaluationReasons: false,
  eventCapacity: 100,
  flushInterval: 2000,
  samplingInterval: 0,
  streamReconnectDelay: 1000,
  allAttributesPrivate: false,
  privateAttributeNames: [],
};

export function validate(options, emitter, extraDefaults, logger) {
  const defaults = utils.extend({ logger: logger }, baseDefaults, extraDefaults);

  const typesForPropertiesWithNoDefault = {
    // Add a value here if we add a configuration property whose type cannot be determined by looking
    // in baseDefaults (for instance, the default is null but if the value isn't null it should be a
    // string). The allowable values are 'boolean', 'string', 'number', 'object', 'function', or
    // 'factory' (the last one means it can be either a function or an object).
    bootstrap: 'any', // could be object or 'localstorage'
    stateProvider: 'object',
  };

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

  function applyDefaults(config, defaults) {
    // This works differently from utils.extend() in that it *will* override a default value
    // if the provided value is explicitly set to null. This provides backward compatibility
    // since in the past we only used the provided values if they were truthy.
    const ret = utils.extend({}, config);
    Object.keys(defaults).forEach(name => {
      if (ret[name] === undefined || ret[name] === null) {
        ret[name] = defaults[name];
      }
    });
    return ret;
  }

  function validateTypesAndNames(config, defaultConfig) {
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
        const defaultValue = defaultConfig[name];
        const typeDesc = typesForPropertiesWithNoDefault[name];
        if (defaultValue === undefined && typeDesc === undefined) {
          reportArgumentError(messages.unknownOption(name));
        } else {
          const expectedType = typeDesc || typeDescForValue(defaultValue);
          const actualType = typeDescForValue(value);
          if (expectedType !== 'any' && actualType !== expectedType) {
            if (expectedType === 'factory' && (typeof value === 'function' || typeof value === 'object')) {
              // for some properties, we allow either a factory function or an instance
              return;
            }
            if (expectedType === 'boolean') {
              ret[name] = !!value;
              reportArgumentError(messages.wrongOptionTypeBoolean(name, actualType));
            } else {
              reportArgumentError(messages.wrongOptionType(name, expectedType, actualType));
              ret[name] = defaultConfig[name];
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

  config = applyDefaults(config, defaults);
  config = validateTypesAndNames(config, defaults);

  if (config.eventCapacity < 1) {
    config.eventCapacity = baseDefaults.eventCapacity;
    reportArgumentError('Invalid eventCapacity configured. Must be an integer > 0.');
  }
  if (config.flushInterval < 2000) {
    config.flushInterval = baseDefaults.flushInterval;
    reportArgumentError('Invalid flush interval configured. Must be an integer >= 2000 (milliseconds).');
  }
  if (config.samplingInterval < 0) {
    config.samplingInterval = 0;
    reportArgumentError('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
  }

  return config;
}
