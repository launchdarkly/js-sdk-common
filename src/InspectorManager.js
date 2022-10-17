import * as messages from './messages';
import SafeInspector from './SafeInspector';
import { onNextTick } from './utils';

/**
 * The types of supported inspectors.
 */
export const InspectorTypes = {
  flagUsed: 'flag-used',
  flagDetailsChanged: 'flag-details-changed',
  flagDetailChanged: 'flag-detail-changed',
  clientIdentityChanged: 'client-identity-changed',
};

Object.freeze(InspectorTypes);

/**
 * Manages dispatching of inspection data to registered inspectors.
 */
export function InspectorManager(inspectors, logger) {
  const manager = {};

  /**
   * Collection of inspectors keyed by type.
   * @type {{[type: string]: object[]}}
   */
  const inspectorsByType = {
    [InspectorTypes.flagUsed]: [],
    [InspectorTypes.flagDetailsChanged]: [],
    [InspectorTypes.flagDetailChanged]: [],
    [InspectorTypes.clientIdentityChanged]: [],
  };

  const safeInspectors = inspectors?.map(inspector => SafeInspector(inspector, logger));

  safeInspectors.forEach(safeInspector => {
    // Only add inspectors of supported types.
    if (Object.prototype.hasOwnProperty.call(inspectorsByType, safeInspector.type)) {
      inspectorsByType[safeInspector.type].push(safeInspector);
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
  manager.hasListeners = type => inspectorsByType[type]?.length;

  /**
   * Notify registered inspectors of a flag being used.
   *
   * The notification itself will be dispatched asynchronously.
   *
   * @param {string} flagKey The key for the flag.
   * @param {Object} detail The LDEvaluationDetail for the flag.
   * @param {Object} user The LDUser for the flag.
   */
  manager.onFlagUsed = (flagKey, detail, user) => {
    if (inspectorsByType[InspectorTypes.flagUsed].length) {
      onNextTick(() => {
        inspectorsByType[InspectorTypes.flagUsed].forEach(inspector => inspector.method(flagKey, detail, user));
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
    if (inspectorsByType[InspectorTypes.flagDetailsChanged].length) {
      onNextTick(() => {
        inspectorsByType[InspectorTypes.flagDetailsChanged].forEach(inspector => inspector.method(flags));
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
    if (inspectorsByType[InspectorTypes.flagDetailChanged].length) {
      onNextTick(() => {
        console.log('what?');
        inspectorsByType[InspectorTypes.flagDetailChanged].forEach(inspector => inspector.method(flagKey, flag));
      });
    }
  };

  /**
   * Notify the registered inspectors that the user identity has changed.
   *
   * The notification itself will be dispatched asynchronously.
   *
   * @param {Object} user The `LDUser` which is now identified.
   */
  manager.onIdentityChanged = user => {
    if (inspectorsByType[InspectorTypes.clientIdentityChanged].length) {
      onNextTick(() => {
        inspectorsByType[InspectorTypes.clientIdentityChanged].forEach(inspector => inspector.method(user));
      });
    }
  };

  return manager;
}
