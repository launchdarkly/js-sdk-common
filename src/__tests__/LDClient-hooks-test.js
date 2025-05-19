const { initialize } = require('../index');
const stubPlatform = require('./stubPlatform');
const { respondJson } = require('./mockHttp');

// Mock the logger functions
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
  beforeIdentify: jest.fn().mockImplementation((_ctx, data) => data), // Pass data through
  afterIdentify: jest.fn(),
});

// Helper to initialize the client for tests
// Disables network requests and event sending by default
async function withClient(initialContext, configOverrides = {}, hooks = [], testFn) {
  const platform = stubPlatform.defaults();
  const server = platform.testing.http.newServer();

  const logger = mockLogger();

  // Disable streaming and event sending unless overridden
  // Configure client to use the mock server's URL
  const defaults = {
    baseUrl: server.url, // Use mock server URL
    streaming: false,
    sendEvents: false,
    useLdd: false,
    logger: logger,
    hooks: hooks, // Pass initial hooks here
  };
  const config = { ...defaults, ...configOverrides };
  const { client, start } = initialize('env', initialContext, config, platform);

  // Set the mock server to return an empty flag set by default
  server.byDefault(respondJson({})); // Correct way to provide initial flags

  start(); // Start the client components

  try {
    // Wait briefly for initialization (client will hit the mock server)
    await client.waitForInitialization(10); // Use a short timeout
    await testFn(client, logger, platform); // Pass client, logger, platform to the test
  } finally {
    await client.close();
    server.close(); // Close the mock server
  }
}

describe('LDClient Hooks Integration', () => {
  const initialContext = { kind: 'user', key: 'user-key-initial' };
  const flagKey = 'test-flag';
  const flagDefaultValue = false;
  // Expected result when flag is not found (as it will be with empty flags)
  const flagNotFoundDetail = {
    value: flagDefaultValue,
    variationIndex: null,
    reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' },
  };

  it('should use hooks registered during configuration', async () => {
    const testHook = createTestHook('Initial Hook');
    const initialData = {}; // Hooks start with empty data

    await withClient(initialContext, {}, [testHook], async client => {
      // Call variation
      await client.variation(flagKey, flagDefaultValue);

      // Check identify hooks
      expect(testHook.beforeIdentify).toHaveBeenCalledTimes(1);
      expect(testHook.beforeIdentify).toHaveBeenCalledWith(
        expect.objectContaining({
          context: initialContext,
          // timeout will be undefined unless explicitly passed to identify
        }),
        initialData
      );
      expect(testHook.afterIdentify).toHaveBeenCalledTimes(1);
      expect(testHook.afterIdentify).toHaveBeenCalledWith(
        expect.objectContaining({
          context: initialContext,
        }),
        initialData, // Assumes beforeIdentify just returned the initial data
        { status: 'completed' }
      );

      // Check evaluation hooks (context from identify is now current)
      expect(testHook.beforeEvaluation).toHaveBeenCalledTimes(1);
      expect(testHook.beforeEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({
          flagKey: flagKey,
          context: initialContext,
          defaultValue: flagDefaultValue,
        }),
        initialData
      );
      expect(testHook.afterEvaluation).toHaveBeenCalledTimes(1);
      expect(testHook.afterEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({
          flagKey: flagKey,
          context: initialContext,
          defaultValue: flagDefaultValue,
        }),
        initialData, // Assumes beforeEvaluation just returned the initial data
        flagNotFoundDetail // Using the default flag not found result
      );
    });
  });

  it('should execute hooks that are added using addHook', async () => {
    const addedHook = createTestHook('Added Hook');
    const identifyContext = { kind: 'user', key: 'user-key-added' };
    const initialData = {};

    // Initialize client *without* the hook initially
    await withClient(initialContext, {}, [], async client => {
      // Add the hook dynamically
      client.addHook(addedHook);

      // Call identify and variation
      await client.identify(identifyContext);
      await client.variation(flagKey, flagDefaultValue);

      // Check identify hooks
      expect(addedHook.beforeIdentify).toHaveBeenCalledTimes(1);
      expect(addedHook.beforeIdentify).toHaveBeenCalledWith(
        expect.objectContaining({ context: identifyContext }),
        initialData
      );
      expect(addedHook.afterIdentify).toHaveBeenCalledTimes(1);
      expect(addedHook.afterIdentify).toHaveBeenCalledWith(
        expect.objectContaining({ context: identifyContext }),
        initialData,
        { status: 'completed' }
      );

      // Check evaluation hooks
      expect(addedHook.beforeEvaluation).toHaveBeenCalledTimes(1);
      expect(addedHook.beforeEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({ flagKey, context: identifyContext, defaultValue: flagDefaultValue }),
        initialData
      );
      expect(addedHook.afterEvaluation).toHaveBeenCalledTimes(1);
      expect(addedHook.afterEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({ flagKey, context: identifyContext, defaultValue: flagDefaultValue }),
        initialData,
        flagNotFoundDetail
      );
    });
  });

  it('should execute both initial hooks and hooks added using addHook', async () => {
    const initialHook = createTestHook('Initial Hook For Both');
    const addedHook = createTestHook('Added Hook For Both');
    const identifyContext = { kind: 'user', key: 'user-key-both' };
    const initialData = {};

    // Initialize client *with* the initial hook
    await withClient(initialContext, {}, [initialHook], async client => {
      // Add the second hook dynamically
      client.addHook(addedHook);

      await client.identify(identifyContext);
      await client.variation(flagKey, flagDefaultValue);

      expect(initialHook.beforeIdentify).toHaveBeenCalledTimes(2);
      expect(initialHook.beforeIdentify).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ context: initialContext }),
        initialData
      );
      expect(initialHook.beforeIdentify).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ context: identifyContext }),
        initialData
      );

      expect(initialHook.afterIdentify).toHaveBeenCalledTimes(2);
      expect(initialHook.afterIdentify).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ context: initialContext }),
        initialData, // Assuming pass-through
        { status: 'completed' }
      );
      expect(initialHook.afterIdentify).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ context: identifyContext }),
        initialData, // Assuming pass-through
        { status: 'completed' }
      );

      expect(addedHook.beforeIdentify).toHaveBeenCalledTimes(1);
      expect(addedHook.beforeIdentify).toHaveBeenCalledWith(
        expect.objectContaining({ context: identifyContext }),
        initialData
      );
      expect(addedHook.afterIdentify).toHaveBeenCalledTimes(1);
      expect(addedHook.afterIdentify).toHaveBeenCalledWith(
        expect.objectContaining({ context: identifyContext }),
        initialData, // Assuming pass-through
        { status: 'completed' }
      );

      // Check evaluation hooks for BOTH hooks
      [initialHook, addedHook].forEach(hook => {
        expect(hook.beforeEvaluation).toHaveBeenCalledTimes(1);
        expect(hook.beforeEvaluation).toHaveBeenCalledWith(
          expect.objectContaining({ flagKey, context: identifyContext, defaultValue: flagDefaultValue }),
          initialData
        );
        expect(hook.afterEvaluation).toHaveBeenCalledTimes(1);
        expect(hook.afterEvaluation).toHaveBeenCalledWith(
          expect.objectContaining({ flagKey, context: identifyContext, defaultValue: flagDefaultValue }),
          initialData, // Assuming pass-through
          flagNotFoundDetail
        );
      });
    });
  });

  it('should execute afterTrack hooks when tracking events', async () => {
    const testHook = {
      beforeEvaluation: jest.fn(),
      afterEvaluation: jest.fn(),
      beforeIdentify: jest.fn(),
      afterIdentify: jest.fn(),
      afterTrack: jest.fn(),
      getMetadata() {
        return {
          name: 'test hook',
        };
      },
    };

    await withClient(initialContext, {}, [testHook], async client => {
      client.track('test', { test: 'data' }, 42);

      expect(testHook.afterTrack).toHaveBeenCalledWith({
        key: 'test',
        context: { kind: 'user', key: 'user-key-initial' },
        data: { test: 'data' },
        metricValue: 42,
      });
    });
  });
});
