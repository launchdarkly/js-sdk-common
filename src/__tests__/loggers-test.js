const { format } = require('util');
const loggers = require('../loggers');

describe('commonBasicLogger', () => {
  it('uses console methods by default', () => {
    const realLog = console.log,
      realInfo = console.info,
      realWarn = console.warn,
      realError = console.error;
    const mockLog = jest.fn(),
      mockInfo = jest.fn(),
      mockWarn = jest.fn(),
      mockError = jest.fn();
    try {
      console.log = mockLog;
      console.info = mockInfo;
      console.warn = mockWarn;
      console.error = mockError;
      const logger = loggers.commonBasicLogger({ level: 'debug' });
      logger.debug('a');
      logger.info('b');
      logger.warn('c');
      logger.error('d');
      expect(mockLog).toHaveBeenCalledWith('[LaunchDarkly] a');
      expect(mockInfo).toHaveBeenCalledWith('[LaunchDarkly] b');
      expect(mockWarn).toHaveBeenCalledWith('[LaunchDarkly] c');
      expect(mockError).toHaveBeenCalledWith('[LaunchDarkly] d');
    } finally {
      console.log = realLog;
      console.info = realInfo;
      console.warn = realWarn;
      console.error = realError;
    }
  });

  it('can write to an arbitrary function', () => {
    const outputFn = jest.fn();
    const logger = loggers.commonBasicLogger({ destination: outputFn });
    logger.warn('hello');
    expect(outputFn).toHaveBeenCalledWith('warn: [LaunchDarkly] hello');
  });

  it('throws an exception immediately if destination is not a function', () => {
    expect(() => loggers.commonBasicLogger({ destination: 'Mars' })).toThrow();
  });

  it('does not use formatter if there is only one argument', () => {
    const outputFn = jest.fn();
    const logger = loggers.commonBasicLogger({ destination: outputFn }, format);
    logger.warn('%d things');
    expect(outputFn).toHaveBeenCalledWith('warn: [LaunchDarkly] %d things');
  });

  it('uses formatter if there are multiple arguments', () => {
    const outputFn = jest.fn();
    const logger = loggers.commonBasicLogger({ destination: outputFn }, format);
    logger.warn('%d things', 3);
    expect(outputFn).toHaveBeenCalledWith('warn: [LaunchDarkly] 3 things');
  });

  it('does not use formatter if there is none', () => {
    const outputFn = jest.fn();
    const logger = loggers.commonBasicLogger({ destination: outputFn }, null);
    logger.warn('%d things', 3);
    expect(outputFn).toHaveBeenCalledWith('warn: [LaunchDarkly] %d things');
  });

  describe('output filtering by level', () => {
    const testLevel = (minLevel, enabledLevels) => {
      it('level: ' + minLevel, () => {
        const outputFn = jest.fn();
        const config = { destination: outputFn };
        if (minLevel) {
          config.level = minLevel;
        }
        const logger = loggers.commonBasicLogger({ level: minLevel, destination: outputFn });
        logger.debug('some debug output');
        logger.info('some info output');
        logger.warn('some warn output');
        logger.error('some error output');
        for (const [level, shouldBeEnabled] of Object.entries(enabledLevels)) {
          const line = level + ': [LaunchDarkly] some ' + level + ' output';
          if (shouldBeEnabled) {
            expect(outputFn).toHaveBeenCalledWith(line);
          } else {
            expect(outputFn).not.toHaveBeenCalledWith(line);
          }
        }
      });
    };

    testLevel('debug', { debug: true, info: true, warn: true, error: true });
    testLevel('info', { debug: false, info: true, warn: true, error: true });
    testLevel('warn', { debug: false, info: false, warn: true, error: true });
    testLevel('error', { debug: false, info: false, warn: false, error: true });
    testLevel('none', { debug: false, info: false, warn: false, error: false });

    // default is info
    testLevel(undefined, { debug: false, info: true, warn: true, error: true });
  });

  it('does not throw an error if console is undefined or null', () => {
    const oldConsole = console;
    try {
      console = null; // eslint-disable-line no-global-assign
      const logger = loggers.commonBasicLogger({ level: 'debug' });
      logger.debug('x');
      logger.info('x');
      logger.warn('x');
      logger.error('x');
      console = undefined; // eslint-disable-line no-global-assign
      logger.debug('x');
      logger.info('x');
      logger.warn('x');
      logger.error('x');
    } finally {
      console = oldConsole; // eslint-disable-line no-global-assign
    }
  });
});

describe('validateLogger', () => {
  function mockLogger() {
    return {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
  }

  const levels = ['error', 'warn', 'info', 'debug'];

  it('throws an error if the logger does not conform to the LDLogger schema', () => {
    // If the method does not exist
    levels.forEach(method => {
      const logger = mockLogger();
      delete logger[method];
      expect(() => loggers.validateLogger(logger)).toThrow(/Provided logger instance must support .* method/);
    });

    // If the method is not a function
    levels.forEach(method => {
      const logger = mockLogger();
      logger[method] = 'invalid';
      expect(() => loggers.validateLogger(logger)).toThrow(/Provided logger instance must support .* method/);
    });
  });
});
