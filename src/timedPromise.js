const { LDTimeoutError } = require('./errors');

/**
 * Returns a promise which errors after t seconds.
 *
 * @param t Timeout in seconds.
 * @param taskName Name of task being timed for logging and error reporting.
 */
function timedPromise(t, taskName) {
  return new Promise((_res, reject) => {
    setTimeout(() => {
      const e = `${taskName} timed out after ${t} seconds.`;
      reject(new LDTimeoutError(e));
    }, t * 1000);
  });
}
module.exports = timedPromise;
