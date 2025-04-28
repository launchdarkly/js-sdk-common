const UNKNOWN_HOOK_NAME = 'unknown hook';
const BEFORE_EVALUATION_STAGE_NAME = 'beforeEvaluation';
const AFTER_EVALUATION_STAGE_NAME = 'afterEvaluation';
const BEFORE_IDENTIFY_STAGE_NAME = 'beforeIdentify';
const AFTER_IDENTIFY_STAGE_NAME = 'afterIdentify';
const AFTER_TRACK_STAGE_NAME = 'afterTrack';

/**
 * Safely executes a hook stage function, logging any errors.
 * @param {{ error: (message: string) => void } | undefined} logger The logger instance.
 * @param {string} method The name of the hook stage being executed (e.g., 'beforeEvaluation').
 * @param {string} hookName The name of the hook.
 * @param {() => any} stage The function representing the hook stage to execute.
 * @param {any} def The default value to return if the stage function throws an error.
 * @returns {any} The result of the stage function, or the default value if an error occurred.
 */
function tryExecuteStage(logger, method, hookName, stage, def) {
  try {
    return stage();
  } catch (err) {
    logger?.error(`An error was encountered in "${method}" of the "${hookName}" hook: ${err}`);
    return def;
  }
}

/**
 * Safely gets the name of a hook from its metadata.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {{ getMetadata: () => { name?: string } }} hook The hook instance.
 * @returns {string} The name of the hook, or 'unknown hook' if unable to retrieve it.
 */
function getHookName(logger, hook) {
  try {
    return hook.getMetadata().name || UNKNOWN_HOOK_NAME;
  } catch {
    logger.error(`Exception thrown getting metadata for hook. Unable to get hook name.`);
    return UNKNOWN_HOOK_NAME;
  }
}

/**
 * Executes the 'beforeEvaluation' stage for all registered hooks.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {Array<{ beforeEvaluation?: (hookContext: object, data: object) => object }>} hooks The array of hook instances.
 * @param {{ flagKey: string, context: object, defaultValue: any }} hookContext The context for the evaluation series.
 * @returns {Array<object>} An array containing the data returned by each hook's 'beforeEvaluation' stage.
 */
function executeBeforeEvaluation(logger, hooks, hookContext) {
  return hooks.map(hook =>
    tryExecuteStage(
      logger,
      BEFORE_EVALUATION_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.beforeEvaluation?.(hookContext, {}) ?? {},
      {}
    )
  );
}

/**
 * Executes the 'afterEvaluation' stage for all registered hooks in reverse order.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {Array<{ afterEvaluation?: (hookContext: object, data: object, result: object) => object }>} hooks The array of hook instances.
 * @param {{ flagKey: string, context: object, defaultValue: any }} hookContext The context for the evaluation series.
 * @param {Array<object>} updatedData The data collected from the 'beforeEvaluation' stages.
 * @param {{ value: any, variationIndex?: number, reason?: object }} result The result of the flag evaluation.
 * @returns {void}
 */
function executeAfterEvaluation(logger, hooks, hookContext, updatedData, result) {
  // This iterates in reverse, versus reversing a shallow copy of the hooks,
  // for efficiency.
  for (let hookIndex = hooks.length - 1; hookIndex >= 0; hookIndex -= 1) {
    const hook = hooks[hookIndex];
    const data = updatedData[hookIndex];
    tryExecuteStage(
      logger,
      AFTER_EVALUATION_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.afterEvaluation?.(hookContext, data, result) ?? {},
      {}
    );
  }
}

/**
 * Executes the 'beforeIdentify' stage for all registered hooks.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {Array<{ beforeIdentify?: (hookContext: object, data: object) => object }>} hooks The array of hook instances.
 * @param {{ context: object, timeout?: number }} hookContext The context for the identify series.
 * @returns {Array<object>} An array containing the data returned by each hook's 'beforeIdentify' stage.
 */
function executeBeforeIdentify(logger, hooks, hookContext) {
  return hooks.map(hook =>
    tryExecuteStage(
      logger,
      BEFORE_IDENTIFY_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.beforeIdentify?.(hookContext, {}) ?? {},
      {}
    )
  );
}

/**
 * Executes the 'afterIdentify' stage for all registered hooks in reverse order.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {Array<{ afterIdentify?: (hookContext: object, data: object, result: object) => object }>} hooks The array of hook instances.
 * @param {{ context: object, timeout?: number }} hookContext The context for the identify series.
 * @param {Array<object>} updatedData The data collected from the 'beforeIdentify' stages.
 * @param {{ status: string }} result The result of the identify operation.
 * @returns {void}
 */
function executeAfterIdentify(logger, hooks, hookContext, updatedData, result) {
  // This iterates in reverse, versus reversing a shallow copy of the hooks,
  // for efficiency.
  for (let hookIndex = hooks.length - 1; hookIndex >= 0; hookIndex -= 1) {
    const hook = hooks[hookIndex];
    const data = updatedData[hookIndex];
    tryExecuteStage(
      logger,
      AFTER_IDENTIFY_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.afterIdentify?.(hookContext, data, result) ?? {},
      {}
    );
  }
}

/**
 * Executes the 'afterTrack' stage for all registered hooks in reverse order.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {Array<{ afterTrack?: (hookContext: { context: object, data: object, metricValue: number }) => void }>} hooks The array of hook instances.
 * @param {{ context: object, data: object, metricValue: number }} hookContext The context for the track operation.
 * @returns {void}
 */
function executeAfterTrack(logger, hooks, hookContext) {
  // This iterates in reverse, versus reversing a shallow copy of the hooks,
  // for efficiency.
  for (let hookIndex = hooks.length - 1; hookIndex >= 0; hookIndex -= 1) {
    const hook = hooks[hookIndex];
    tryExecuteStage(
      logger,
      AFTER_TRACK_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.afterTrack?.(hookContext),
      undefined
    );
  }
}

/**
 * Factory function to create a HookRunner instance.
 * Manages the execution of hooks for flag evaluations and identify operations.
 * @param {{ error: (message: string) => void }} logger The logger instance.
 * @param {Array<object> | undefined} initialHooks An optional array of hooks to initialize with.
 * @returns {{
 *  withEvaluation: (key: string, context: object, defaultValue: any, method: () => { value: any, variationIndex?: number, reason?: object }) => { value: any, variationIndex?: number, reason?: object },
 *  identify: (context: object, timeout?: number) => (result: { status: string }) => void,
 *  addHook: (hook: object) => void
 * }} The hook runner object with methods to manage and execute hooks.
 */
function createHookRunner(logger, initialHooks) {
  // Use local variable instead of instance property
  const hooksInternal = initialHooks ? [...initialHooks] : [];

  /**
   * Wraps a flag evaluation method with before/after hook stages.
   * @param {string} key The flag key.
   * @param {object} context The evaluation context.
   * @param {any} defaultValue The default value for the flag.
   * @param {() => { value: any, variationIndex?: number, reason?: object }} method The function that performs the actual flag evaluation.
   * @returns {{ value: any, variationIndex?: number, reason?: object }} The result of the flag evaluation.
   */
  function withEvaluation(key, context, defaultValue, method) {
    if (hooksInternal.length === 0) {
      return method();
    }
    const hooks = [...hooksInternal];
    /** @type {{ flagKey: string, context: object, defaultValue: any }} */
    const hookContext = {
      flagKey: key,
      context,
      defaultValue,
    };

    // Use the logger passed into the factory
    const hookData = executeBeforeEvaluation(logger, hooks, hookContext);
    const result = method();
    executeAfterEvaluation(logger, hooks, hookContext, hookData, result);
    return result;
  }

  /**
   * Wraps the identify operation with before/after hook stages.
   * Executes the 'beforeIdentify' stage immediately and returns a function
   * to execute the 'afterIdentify' stage later.
   * @param {object} context The context being identified.
   * @param {number | undefined} timeout Optional timeout for the identify operation.
   * @returns {(result: { status: string }) => void} A function to call after the identify operation completes.
   */
  function identify(context, timeout) {
    const hooks = [...hooksInternal];
    /** @type {{ context: object, timeout?: number }} */
    const hookContext = {
      context,
      timeout,
    };
    // Use the logger passed into the factory
    const hookData = executeBeforeIdentify(logger, hooks, hookContext);
    /**
     * Executes the 'afterIdentify' hook stage.
     * @param {{ status: string }} result The result of the identify operation.
     */
    return result => {
      executeAfterIdentify(logger, hooks, hookContext, hookData, result);
    };
  }

  /**
   * Adds a new hook to the runner.
   * @param {object} hook The hook instance to add.
   * @returns {void}
   */
  function addHook(hook) {
    // Mutate the internal hooks array
    hooksInternal.push(hook);
  }

  /**
   * Executes the 'afterTrack' stage for all registered hooks in reverse order.
   * @param {{ context: object, data: object, metricValue: number }} hookContext The context for the track operation.
   * @returns {void}
   */
  function afterTrack(hookContext) {
    if (hooksInternal.length === 0) {
      return;
    }
    const hooks = [...hooksInternal];
    executeAfterTrack(logger, hooks, hookContext);
  }

  return {
    withEvaluation,
    identify,
    addHook,
    afterTrack,
  };
}

module.exports = createHookRunner;
