// The HookRunner factory function under test
const createHookRunner = require('../HookRunner');

// Mock the logger functions we expect to be called
const mockLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
});

// Define a basic Hook structure for tests
const createTestHook = (name = 'Test Hook') => ({
  getMetadata: jest.fn().mockReturnValue({ name }),
  beforeEvaluation: jest.fn(),
  afterEvaluation: jest.fn(),
  beforeIdentify: jest.fn(),
  afterIdentify: jest.fn(),
});

describe('Given a logger, runner, and hook', () => {
  let logger;
  let testHook;
  let hookRunner;

  beforeEach(() => {
    // Reset mocks and create fresh instances for each test
    logger = mockLogger();
    testHook = createTestHook();
    // Initialize the runner with the test hook
    hookRunner = createHookRunner(logger, [testHook]);
  });

  it('evaluation: should execute hooks and return the evaluation result', () => {
    const key = 'test-flag';
    const context = { kind: 'user', key: 'user-123' };
    const defaultValue = false;
    const evaluationResult = {
      value: true,
      variationIndex: 1,
      reason: { kind: 'OFF' },
    };
    // Mock the core evaluation method
    const method = jest.fn().mockReturnValue(evaluationResult);

    // The data expected to be passed between stages initially is empty
    const initialData = {};

    const result = hookRunner.withEvaluation(key, context, defaultValue, method);

    // Check if beforeEvaluation was called correctly
    expect(testHook.beforeEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        flagKey: key,
        context,
        defaultValue,
      }),
      initialData // Initial data passed to beforeEvaluation
    );

    // Check if the original evaluation method was called
    expect(method).toHaveBeenCalled();

    // Check if afterEvaluation was called correctly
    expect(testHook.afterEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        flagKey: key,
        context,
        defaultValue,
      }),
      initialData, // Data returned from (mocked) beforeEvaluation
      evaluationResult
    );

    // Verify the final result matches the evaluation result
    expect(result).toEqual(evaluationResult);
  });

  it('evaluation: should handle errors in beforeEvaluation hook', () => {
    const errorHook = createTestHook('Error Hook');
    const testError = new Error('Hook error in before');
    errorHook.beforeEvaluation.mockImplementation(() => {
      throw testError;
    });

    const errorHookRunner = createHookRunner(logger, [errorHook]);
    const method = jest.fn().mockReturnValue({ value: 'default', reason: { kind: 'ERROR' } });
    const initialData = {}; // Data returned by the failing hook (default)

    errorHookRunner.withEvaluation('test-flag', { kind: 'user', key: 'user-123' }, false, method);

    // Error should be logged
    expect(logger.error).toHaveBeenCalledWith(
      'An error was encountered in "beforeEvaluation" of the "Error Hook" hook: Error: Hook error in before'
    );
    // Method should still be called
    expect(method).toHaveBeenCalled();
    // After evaluation should still be called, passing the default data ({}) because before failed
    expect(errorHook.afterEvaluation).toHaveBeenCalledWith(expect.anything(), initialData, expect.anything());
  });

  it('evaluation: should handle errors in afterEvaluation hook', () => {
    const errorHook = createTestHook('Error Hook');
    const testError = new Error('Hook error in after');
    errorHook.afterEvaluation.mockImplementation(() => {
      throw testError;
    });

    const errorHookRunner = createHookRunner(logger, [errorHook]);
    const method = jest.fn().mockReturnValue({ value: 'default', reason: { kind: 'FALLTHROUGH' } });
    const initialData = {};

    errorHookRunner.withEvaluation('test-flag', { kind: 'user', key: 'user-123' }, false, method);

    // Before evaluation should be called normally
    expect(errorHook.beforeEvaluation).toHaveBeenCalled();
    // Method should be called normally
    expect(method).toHaveBeenCalled();
    // Error should be logged for afterEvaluation
    expect(logger.error).toHaveBeenCalledWith(
      'An error was encountered in "afterEvaluation" of the "Error Hook" hook: Error: Hook error in after'
    );
  });

  it('evaluation: should skip hook execution if no hooks are provided', () => {
    const emptyHookRunner = createHookRunner(logger, []); // No initial hooks
    const method = jest.fn().mockReturnValue({ value: true });

    emptyHookRunner.withEvaluation('test-flag', { kind: 'user', key: 'user-123' }, false, method);

    // Only the method should be called
    expect(method).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('evaluation: should pass data from beforeEvaluation to afterEvaluation', () => {
    const key = 'test-flag';
    const context = { kind: 'user', key: 'user-123' };
    const defaultValue = false;
    const evaluationResult = { value: true };
    const seriesData = { testData: 'before data' };

    // Mock beforeEvaluation to return specific data
    testHook.beforeEvaluation.mockReturnValue(seriesData);
    const method = jest.fn().mockReturnValue(evaluationResult);

    hookRunner.withEvaluation(key, context, defaultValue, method);

    expect(testHook.beforeEvaluation).toHaveBeenCalled();
    // afterEvaluation should receive the data returned by beforeEvaluation
    expect(testHook.afterEvaluation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(seriesData), // Check if the passed data includes seriesData
      evaluationResult
    );
  });

  it('identify: should execute identify hooks', () => {
    const context = { kind: 'user', key: 'user-123' };
    const timeout = 10;
    const identifyResult = { status: 'completed' }; // Example result structure
    const initialData = {};

    // Call identify to get the callback
    const identifyCallback = hookRunner.identify(context, timeout);

    // Check if beforeIdentify was called immediately
    expect(testHook.beforeIdentify).toHaveBeenCalledWith(
      expect.objectContaining({
        context,
        timeout,
      }),
      initialData // Initial data passed to beforeIdentify
    );

    // Now invoke the callback returned by identify
    identifyCallback(identifyResult);

    // Check if afterIdentify was called with the correct arguments
    expect(testHook.afterIdentify).toHaveBeenCalledWith(
      expect.objectContaining({
        context,
        timeout,
      }),
      initialData, // Data returned from (mocked) beforeIdentify
      identifyResult
    );
  });

  it('identify: should handle errors in beforeIdentify hook', () => {
    const errorHook = createTestHook('Error Hook');
    const testError = new Error('Hook error in before identify');
    errorHook.beforeIdentify.mockImplementation(() => {
      throw testError;
    });

    const errorHookRunner = createHookRunner(logger, [errorHook]);
    const identifyCallback = errorHookRunner.identify({ kind: 'user', key: 'user-456' }, 1000);

    // Error should be logged immediately from beforeIdentify
    expect(logger.error).toHaveBeenCalledWith(
      'An error was encountered in "beforeIdentify" of the "Error Hook" hook: Error: Hook error in before identify'
    );

    // Execute the callback - afterIdentify should still be called
    identifyCallback({ status: 'error' }); // Example result

    // Check afterIdentify was called, receiving default data {}
    expect(errorHook.afterIdentify).toHaveBeenCalledWith(expect.anything(), {}, expect.anything());
  });

    it('identify: should handle errors in afterIdentify hook', () => {
    const errorHook = createTestHook('Error Hook');
    const testError = new Error('Hook error in after identify');
    errorHook.afterIdentify.mockImplementation(() => {
      throw testError;
    });

    const errorHookRunner = createHookRunner(logger, [errorHook]);
    const identifyCallback = errorHookRunner.identify({ kind: 'user', key: 'user-456' }, 1000);

    // Before should run fine
    expect(errorHook.beforeIdentify).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();

    // Execute the callback - this should trigger the error in afterIdentify
    identifyCallback({ status: 'completed' }); // Example result

    // Error should be logged from afterIdentify
    expect(logger.error).toHaveBeenCalledWith(
      'An error was encountered in "afterIdentify" of the "Error Hook" hook: Error: Hook error in after identify'
    );
  });


  it('identify: should pass data from beforeIdentify to afterIdentify', () => {
    const context = { kind: 'user', key: 'user-789' };
    const timeout = 50;
    const identifyResult = { status: 'completed' };
    const seriesData = { testData: 'before identify data' };

    // Mock beforeIdentify to return specific data
    testHook.beforeIdentify.mockReturnValue(seriesData);

    const identifyCallback = hookRunner.identify(context, timeout);
    identifyCallback(identifyResult);

    expect(testHook.beforeIdentify).toHaveBeenCalled();
    // afterIdentify should receive the data returned by beforeIdentify
    expect(testHook.afterIdentify).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(seriesData), // Check if the passed data includes seriesData
      identifyResult
    );
  });

  it('addHook: should use the added hook in future invocations', () => {
    const newHook = createTestHook('New Hook');
    hookRunner.addHook(newHook);

    const method = jest.fn().mockReturnValue({ value: true });
    hookRunner.withEvaluation('test-flag', { kind: 'user', key: 'user-123' }, false, method);

    // Both the original and the new hook should have been called
    expect(testHook.beforeEvaluation).toHaveBeenCalled();
    expect(testHook.afterEvaluation).toHaveBeenCalled();
    expect(newHook.beforeEvaluation).toHaveBeenCalled();
    expect(newHook.afterEvaluation).toHaveBeenCalled();
  });

  it('error handling: should log "unknown hook" when getMetadata throws', () => {
    const errorMetadataHook = {
      getMetadata: jest.fn().mockImplementation(() => {
        throw new Error('Metadata error');
      }),
      beforeEvaluation: jest.fn().mockImplementation(() => {
        throw new Error('Eval error'); // Add an error here to trigger logging
      }),
      afterEvaluation: jest.fn(),
      // Add other methods if needed for completeness, mocked simply
      beforeIdentify: jest.fn(),
      afterIdentify: jest.fn(),
    };

    const errorRunner = createHookRunner(logger, [errorMetadataHook]);
    errorRunner.withEvaluation('flag', {}, false, () => ({ value: null }));

    // First error: getting metadata
    expect(logger.error).toHaveBeenCalledWith(
      'Exception thrown getting metadata for hook. Unable to get hook name.'
    );
    // Second error: executing the stage with 'unknown hook' name
    expect(logger.error).toHaveBeenCalledWith(
      'An error was encountered in "beforeEvaluation" of the "unknown hook" hook: Error: Eval error'
    );
  });

  it('error handling: should log "unknown hook" when getMetadata returns empty name', () => {
    const emptyNameHook = createTestHook(''); // Create hook with empty name
     emptyNameHook.beforeEvaluation.mockImplementation(() => {
        throw new Error('Eval error'); // Add an error here to trigger logging
      });

    const errorRunner = createHookRunner(logger, [emptyNameHook]);
    errorRunner.withEvaluation('flag', {}, false, () => ({ value: null }));

    // Verify getMetadata was called (even though name is empty)
     expect(emptyNameHook.getMetadata).toHaveBeenCalled();

    // Verify the error uses 'unknown hook'
    expect(logger.error).toHaveBeenCalledWith(
      'An error was encountered in "beforeEvaluation" of the "unknown hook" hook: Error: Eval error'
    );
  });

  it('error handling: should log the correct hook name when an error occurs', () => {
    const hookName = 'Specific Error Hook';
    const errorHook = createTestHook(hookName);
    const testError = new Error('Specific test error');
    errorHook.beforeEvaluation.mockImplementation(() => {
      throw testError;
    });

    const specificRunner = createHookRunner(logger, [errorHook]);
    specificRunner.withEvaluation('flag', {}, false, () => ({ value: null }));

    // Verify getMetadata was called
    expect(errorHook.getMetadata).toHaveBeenCalled();
    // Verify the error message includes the correct hook name
    expect(logger.error).toHaveBeenCalledWith(
      `An error was encountered in "beforeEvaluation" of the "${hookName}" hook: Error: Specific test error`
    );
  });
}); 