const errors = require('./errors');
const { validateLogger } = require('./loggers');
const messages = require('./messages');
const utils = require('./utils');

// baseOptionDefs should contain an entry for each supported configuration option in the common package.
// Each entry can have three properties:
// - "default": the default value if any
// - "type": a type constraint used if the type can't be inferred from the default value). The allowable
//   values are "boolean", "string", "number", "array", "object", "function", or several of these OR'd
//   together with "|" ("function|object").
// - "minimum": minimum value if any for numeric properties
//
// The extraOptionDefs parameter to validate() uses the same format.
const baseOptionDefs = {
  baseUrl: { default: 'https://app.launchdarkly.com' },
  streamUrl: { default: 'https://clientstream.launchdarkly.com' },
  eventsUrl: { default: 'https://events.launchdarkly.com' },
  sendEvents: { default: true },
  streaming: { type: 'boolean' }, // default for this is undefined, which is different from false
  sendLDHeaders: { default: true },
  requestHeaderTransform: { type: 'function' },
  sendEventsOnlyForVariation: { default: false },
  useReport: { default: false },
  evaluationReasons: { default: false },
  eventCapacity: { default: 100, minimum: 1 },
  flushInterval: { default: 2000, minimum: 2000 },
  samplingInterval: { default: 0, minimum: 0 },
  streamReconnectDelay: { default: 1000, minimum: 0 },
  allAttributesPrivate: { default: false },
  privateAttributes: { default: [] },
  bootstrap: { type: 'string|object' },
  diagnosticRecordingInterval: { default: 900000, minimum: 2000 },
  diagnosticOptOut: { default: false },
  wrapperName: { type: 'string' },
  wrapperVersion: { type: 'string' },
  stateProvider: { type: 'object' }, // not a public option, used internally
  application: { validator: applicationConfigValidator },
  inspectors: { default: [] },
};

/**
 * Expression to validate characters that are allowed in tag keys and values.
 */
const allowedTagCharacters = /^(\w|\.|-)+$/;

function canonicalizeUrl(url) {
  return url && url.replace(/\/+$/, '');
}

/**
 * Verify that a value meets the requirements for a tag value.
 * @param {string} tagValue
 * @param {Object} logger
 */
function validateTagValue(name, tagValue, logger) {
  if (typeof tagValue !== 'string' || !tagValue.match(allowedTagCharacters)) {
    logger.warn(messages.invalidTagValue(name));
    return undefined;
  }
  if (tagValue.length > 64) {
    logger.warn(messages.tagValueTooLong(name));
    return undefined;
  }
  return tagValue;
}

function applicationConfigValidator(name, value, logger) {
  const validated = {};
  if (value.id) {
    validated.id = validateTagValue(`${name}.id`, value.id, logger);
  }
  if (value.version) {
    validated.version = validateTagValue(`${name}.version`, value.version, logger);
  }
  return validated;
}

function validate(options, emitter, extraOptionDefs, logger) {
  const optionDefs = utils.extend({ logger: { default: logger } }, baseOptionDefs, extraOptionDefs);

  const deprecatedOptions = {
    // As of the latest major version, there are no deprecated options. Next time we deprecate
    // something, add an item here where the property name is the deprecated name, and the
    // property value is the preferred name if any, or null/undefined if there is no replacement.
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
      if (t === 'boolean' || t === 'string' || t === 'number' || t === 'function') {
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
          const validator = optionDef.validator;
          if (validator) {
            const validated = validator(name, config[name], logger);
            if (validated !== undefined) {
              ret[name] = validated;
            } else {
              delete ret[name];
            }
          } else if (expectedType !== 'any') {
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
            } else {
              if (actualType === 'number' && optionDef.minimum !== undefined && value < optionDef.minimum) {
                reportArgumentError(messages.optionBelowMinimum(name, value, optionDef.minimum));
                ret[name] = optionDef.minimum;
              }
            }
          }
        }
      }
    });

    ret.baseUrl = canonicalizeUrl(ret.baseUrl);
    ret.streamUrl = canonicalizeUrl(ret.streamUrl);
    ret.eventsUrl = canonicalizeUrl(ret.eventsUrl);

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
  validateLogger(config.logger);

  return config;
}

/**
 * Get tags for the specified configuration.
 *
 * If any additional tags are added to the configuration, then the tags from
 * this method should be extended with those.
 * @param {Object} config The already valiated configuration.
 * @returns {Object} The tag configuration.
 */
function getTags(config) {
  const tags = {};
  if (config) {
    if (config.application && config.application.id !== undefined && config.application.id !== null) {
      tags['application-id'] = [config.application.id];
    }
    if (config.application && config.application.version !== undefined && config.application.id !== null) {
      tags['application-version'] = [config.application.version];
    }
  }

  return tags;
}

module.exports = {
  baseOptionDefs,
  validate,
  getTags,
};
