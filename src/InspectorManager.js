const messages = require('./messages');
const SafeInspector = require('./SafeInspector');
const { onNextTick } = require('./utils');

/**
 * The types of supported inspectors.
 */
const InspectorTypes = {
  flagUsed: 'flag-used',
  flagDetailsChanged: 'flag-details-changed',
  flagDetailChanged: 'flag-detail-changed',
  clientIdentityChanged: 'client-identity-changed',
};

Object.freeze(InspectorTypes);

/**
 * Manages dispatching of inspection data to registered inspectors.
 */
function InspectorManager(inspectors, logger) {
  const manager = {};

  /**
   * Collection of inspectors keyed by type.
   *
   * Inspectors are async by default.
   *
   * @type {{[type: string]: object[]}}
   */
  const inspectorsByType = {
    [InspectorTypes.flagUsed]: [],
    [InspectorTypes.flagDetailsChanged]: [],
    [InspectorTypes.flagDetailChanged]: [],
    [InspectorTypes.clientIdentityChanged]: [],
  };
  /**
   * Collection synchronous of inspectors keyed by type.
   *
   * @type {{[type: string]: object[]}}
   */
  const synchronousInspectorsByType = {
    [InspectorTypes.flagUsed]: [],
    [InspectorTypes.flagDetailsChanged]: [],
    [InspectorTypes.flagDetailChanged]: [],
    [InspectorTypes.clientIdentityChanged]: [],
  };

  const safeInspectors = inspectors && inspectors.map(inspector => SafeInspector(inspector, logger));

  safeInspectors &&
    safeInspectors.forEach(safeInspector => {
      // Only add inspectors of supported types.
      if (Object.prototype.hasOwnProperty.call(inspectorsByType, safeInspector.type) && !safeInspector.synchronous) {
        inspectorsByType[safeInspector.type].push(safeInspector);
      } else if (
        Object.prototype.hasOwnProperty.call(synchronousInspectorsByType, safeInspector.type) &&
        safeInspector.synchronous
      ) {
        synchronousInspectorsByType[safeInspector.type].push(safeInspector);
      } else {
        logger.warn(messages.invalidInspector(safeInspector.type, safeInspector.name));
      }
    });

  /**
   * Check if there is an inspector of a specific type registered.
   *
   * @param {string} type The type of the inspector to check.
   * @returns True if there are any inspectors of that type registered.
   */
  manager.hasListeners = type =>
    (inspectorsByType[type] && inspectorsByType[type].length) ||
    (synchronousInspectorsByType[type] && synchronousInspectorsByType[type].length);

  /**
   * Notify registered inspectors of a flag being used.
   *
   * The notification itself will be dispatched asynchronously.
   *
   * @param {string} flagKey The key for the flag.
   * @param {Object} detail The LDEvaluationDetail for the flag.
   * @param {Object} context The LDContext for the flag.
   */
  manager.onFlagUsed = (flagKey, detail, context) => {
    const type = InspectorTypes.flagUsed;
    if (synchronousInspectorsByType[type].length) {
      synchronousInspectorsByType[type].forEach(inspector => inspector.method(flagKey, detail, context));
    }
    if (inspectorsByType[type].length) {
      onNextTick(() => {
        inspectorsByType[type].forEach(inspector => inspector.method(flagKey, detail, context));
      });
    }
  };

  /**
   * Notify registered inspectors that the flags have been replaced.
   *
   * The notification itself will be dispatched asynchronously.
   *
   * @param {Record<string, Object>} flags The current flags as a Record<string, LDEvaluationDetail>.
   */
  manager.onFlags = flags => {
    const type = InspectorTypes.flagDetailsChanged;
    if (synchronousInspectorsByType[type].length) {
      synchronousInspectorsByType[type].forEach(inspector => inspector.method(flags));
    }
    if (inspectorsByType[type].length) {
      onNextTick(() => {
        inspectorsByType[type].forEach(inspector => inspector.method(flags));
      });
    }
  };

  /**
   * Notify registered inspectors that a flag value has changed.
   *
   * The notification itself will be dispatched asynchronously.
   *
   * @param {string} flagKey The key for the flag that changed.
   * @param {Object} flag An `LDEvaluationDetail` for the flag.
   */
  manager.onFlagChanged = (flagKey, flag) => {
    const type = InspectorTypes.flagDetailChanged;
    if (synchronousInspectorsByType[type].length) {
      synchronousInspectorsByType[type].forEach(inspector => inspector.method(flagKey, flag));
    }
    if (inspectorsByType[type].length) {
      onNextTick(() => {
        inspectorsByType[type].forEach(inspector => inspector.method(flagKey, flag));
      });
    }
  };

  /**
   * Notify the registered inspectors that the context identity has changed.
   *
   * The notification itself will be dispatched asynchronously.
   *
   * @param {Object} context The `LDContext` which is now identified.
   */
  manager.onIdentityChanged = context => {
    const type = InspectorTypes.clientIdentityChanged;
    if (synchronousInspectorsByType[type].length) {
      synchronousInspectorsByType[type].forEach(inspector => inspector.method(context));
    }
    if (inspectorsByType[type].length) {
      onNextTick(() => {
        inspectorsByType[type].forEach(inspector => inspector.method(context));
      });
    }
  };

  return manager;
}

module.exports = { InspectorTypes, InspectorManager };
