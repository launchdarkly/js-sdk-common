const messages = require('./messages');

/**
 * Wrap an inspector ensuring that calling its methods are safe.
 * @param {object} inspector Inspector to wrap.
 */
function SafeInspector(inspector, logger) {
  let errorLogged = false;
  const wrapper = {
    type: inspector.type,
    name: inspector.name,
    synchronous: inspector.synchronous,
  };

  wrapper.method = (...args) => {
    try {
      inspector.method(...args);
    } catch {
      // If something goes wrong in an inspector we want to log that something
      // went wrong. We don't want to flood the logs, so we only log something
      // the first time that something goes wrong.
      // We do not include the exception in the log, because we do not know what
      // kind of data it may contain.
      if (!errorLogged) {
        errorLogged = true;
        logger.warn(messages.inspectorMethodError(wrapper.type, wrapper.name));
      }
      // Prevent errors.
    }
  };

  return wrapper;
}

module.exports = SafeInspector;
