const logLevels = ['debug', 'info', 'warn', 'error', 'none'];

/**
 * A simple logger that writes to stderr.
 */
function commonBasicLogger(options, formatFn) {
  if (options && options.destination && typeof options.destination !== 'function') {
    throw new Error('destination for basicLogger was set to a non-function');
  }

  function toConsole(methodName) {
    // The global console variable is not guaranteed to be defined at all times in all browsers:
    // https://www.beyondjava.net/console-log-surprises-with-internet-explorer-11-and-edge
    return function(line) {
      if (console && console[methodName]) {
        console[methodName].call(console, line);
      }
    };
  }
  const destinations =
    options && options.destination
      ? [options.destination, options.destination, options.destination, options.destination]
      : [toConsole('log'), toConsole('info'), toConsole('warn'), toConsole('error')];
  const prependLevelToMessage = !!(options && options.destination); // if we're writing to console.warn, etc. we don't need the prefix
  const prefix =
    !options || options.prefix === undefined || options.prefix === null ? '[LaunchDarkly] ' : options.prefix;

  let minLevel = 1; // default is 'info'
  if (options && options.level) {
    for (let i = 0; i < logLevels.length; i++) {
      if (logLevels[i] === options.level) {
        minLevel = i;
      }
    }
  }

  function write(levelIndex, levelName, args) {
    if (args.length < 1) {
      return;
    }
    let line;
    const fullPrefix = prependLevelToMessage ? levelName + ': ' + prefix : prefix;
    if (args.length === 1 || !formatFn) {
      line = fullPrefix + args[0];
    } else {
      const tempArgs = [...args];
      tempArgs[0] = fullPrefix + tempArgs[0];
      line = formatFn(...tempArgs);
    }
    try {
      destinations[levelIndex](line);
    } catch (err) {
      console &&
        console.log &&
        console.log("[LaunchDarkly] Configured logger's " + levelName + ' method threw an exception: ' + err);
    }
  }

  const logger = {};
  for (let i = 0; i < logLevels.length; i++) {
    const levelName = logLevels[i];
    if (levelName !== 'none') {
      if (i < minLevel) {
        logger[levelName] = () => {};
      } else {
        const levelIndex = i;
        logger[levelName] = function() {
          // can't use arrow function with "arguments"
          write(levelIndex, levelName, arguments);
        };
      }
    }
  }

  return logger;
}

function validateLogger(logger) {
  logLevels.forEach(level => {
    if (level !== 'none' && (!logger[level] || typeof logger[level] !== 'function')) {
      throw new Error('Provided logger instance must support logger.' + level + '(...) method');
      // Note that the SDK normally does not throw exceptions to the application, but that rule
      // does not apply to LDClient.init() which will throw an exception if the parameters are so
      // invalid that we cannot proceed with creating the client. An invalid logger meets those
      // criteria since the SDK calls the logger during nearly all of its operations.
    }
  });
}

module.exports = {
  commonBasicLogger,
  validateLogger,
};
