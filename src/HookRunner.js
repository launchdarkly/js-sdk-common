const UNKNOWN_HOOK_NAME = 'unknown hook';
const BEFORE_EVALUATION_STAGE_NAME = 'beforeEvaluation';
const AFTER_EVALUATION_STAGE_NAME = 'afterEvaluation';

function tryExecuteStage(logger, method, hookName, stage, def) {
  try {
    return stage();
  } catch (err) {
    logger?.error(`An error was encountered in "${method}" of the "${hookName}" hook: ${err}`);
    return def;
  }
}

function getHookName(logger, hook) {
  try {
    return hook.getMetadata().name || UNKNOWN_HOOK_NAME;
  } catch {
    logger.error(`Exception thrown getting metadata for hook. Unable to get hook name.`);
    return UNKNOWN_HOOK_NAME;
  }
}

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

function executeBeforeIdentify(logger, hooks, hookContext) {
  return hooks.map(hook =>
    tryExecuteStage(
      logger,
      BEFORE_EVALUATION_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.beforeIdentify?.(hookContext, {}) ?? {},
      {}
    )
  );
}

function executeAfterIdentify(logger, hooks, hookContext, updatedData, result) {
  // This iterates in reverse, versus reversing a shallow copy of the hooks,
  // for efficiency.
  for (let hookIndex = hooks.length - 1; hookIndex >= 0; hookIndex -= 1) {
    const hook = hooks[hookIndex];
    const data = updatedData[hookIndex];
    tryExecuteStage(
      logger,
      AFTER_EVALUATION_STAGE_NAME,
      getHookName(logger, hook),
      () => hook?.afterIdentify?.(hookContext, data, result) ?? {},
      {}
    );
  }
}

class HookRunner {
  constructor(logger, initialHooks) {
    this._logger = logger;
    this._hooks = initialHooks ? [...initialHooks] : [];
  }

  withEvaluation(key, context, defaultValue, method) {
    if (this._hooks.length === 0) {
      return method();
    }
    const hooks = [...this._hooks];
    const hookContext = {
      flagKey: key,
      context,
      defaultValue,
    };

    const hookData = executeBeforeEvaluation(this._logger, hooks, hookContext);
    const result = method();
    executeAfterEvaluation(this._logger, hooks, hookContext, hookData, result);
    return result;
  }

  identify(context, timeout) {
    const hooks = [...this._hooks];
    const hookContext = {
      context,
      timeout,
    };
    const hookData = executeBeforeIdentify(this._logger, hooks, hookContext);
    return result => {
      executeAfterIdentify(this._logger, hooks, hookContext, hookData, result);
    };
  }

  addHook(hook) {
    this._hooks.push(hook);
  }
}

module.exports = HookRunner;
