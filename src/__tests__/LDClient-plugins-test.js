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
  beforeEvaluation: jest.fn().mockImplementation((_ctx, data) => data),
  afterEvaluation: jest.fn().mockImplementation((_ctx, data) => data),
  beforeIdentify: jest.fn().mockImplementation((_ctx, data) => data),
  afterIdentify: jest.fn().mockImplementation((_ctx, data) => data),
  afterTrack: jest.fn().mockImplementation((_ctx, data) => data),
});

// Define a basic Plugin structure for tests
const createTestPlugin = (name = 'Test Plugin', hooks = []) => ({
  getMetadata: jest.fn().mockReturnValue({ name }),
  register: jest.fn(),
  getHooks: jest.fn().mockReturnValue(hooks),
});

// Helper to initialize the client for tests
async function withClient(initialContext, configOverrides = {}, plugins = [], testFn) {
  const platform = stubPlatform.defaults();
  const server = platform.testing.http.newServer();
  const logger = mockLogger();

  // Disable streaming and event sending unless overridden
  const defaults = {
    baseUrl: server.url,
    streaming: false,
    sendEvents: false,
    useLdd: false,
    logger: logger,
    plugins: plugins,
  };
  const config = { ...defaults, ...configOverrides };
  const { client, start } = initialize('env', initialContext, config, platform);

  server.byDefault(respondJson({}));
  start();

  try {
    await client.waitForInitialization(10);
    await testFn(client, logger, platform);
  } finally {
    await client.close();
    server.close();
  }
}

it('registers plugins and executes hooks during initialization', async () => {
  const mockHook = createTestHook('test-hook');
  const mockPlugin = createTestPlugin('test-plugin', [mockHook]);

  await withClient({ key: 'user-key', kind: 'user' }, {}, [mockPlugin], async client => {
    // Verify the plugin was registered
    expect(mockPlugin.register).toHaveBeenCalled();

    // Test identify hook
    await client.identify({ key: 'user-key', kind: 'user' });
    expect(mockHook.beforeIdentify).toHaveBeenCalledWith(
      { context: { key: 'user-key', kind: 'user' }, timeout: undefined },
      {}
    );
    expect(mockHook.afterIdentify).toHaveBeenCalledWith(
      { context: { key: 'user-key', kind: 'user' }, timeout: undefined },
      {},
      { status: 'completed' }
    );

    // Test variation hook
    client.variation('flag-key', false);
    expect(mockHook.beforeEvaluation).toHaveBeenCalledWith(
      {
        context: { key: 'user-key', kind: 'user' },
        defaultValue: false,
        flagKey: 'flag-key',
      },
      {}
    );
    expect(mockHook.afterEvaluation).toHaveBeenCalled();

    // Test track hook
    client.track('event-key', { data: true }, 42);
    expect(mockHook.afterTrack).toHaveBeenCalledWith({
      context: { key: 'user-key', kind: 'user' },
      key: 'event-key',
      data: { data: true },
      metricValue: 42,
    });
  });
});

it('registers multiple plugins and executes all hooks', async () => {
  const mockHook1 = createTestHook('test-hook-1');
  const mockHook2 = createTestHook('test-hook-2');
  const mockPlugin1 = createTestPlugin('test-plugin-1', [mockHook1]);
  const mockPlugin2 = createTestPlugin('test-plugin-2', [mockHook2]);

  await withClient({ key: 'user-key', kind: 'user' }, {}, [mockPlugin1, mockPlugin2], async client => {
    // Verify plugins were registered
    expect(mockPlugin1.register).toHaveBeenCalled();
    expect(mockPlugin2.register).toHaveBeenCalled();

    // Test that both hooks work
    await client.identify({ key: 'user-key', kind: 'user' });
    client.variation('flag-key', false);
    client.track('event-key', { data: true }, 42);

    expect(mockHook1.beforeEvaluation).toHaveBeenCalled();
    expect(mockHook1.afterEvaluation).toHaveBeenCalled();
    expect(mockHook2.beforeEvaluation).toHaveBeenCalled();
    expect(mockHook2.afterEvaluation).toHaveBeenCalled();
    expect(mockHook1.afterTrack).toHaveBeenCalled();
    expect(mockHook2.afterTrack).toHaveBeenCalled();
  });
});

it('passes correct environmentMetadata to plugin getHooks and register functions', async () => {
  const mockPlugin = createTestPlugin('test-plugin');
  const options = {
    wrapperName: 'test-wrapper',
    wrapperVersion: '2.0.0',
    application: {
      name: 'test-app',
      version: '3.0.0',
    },
  };

  await withClient(
    { key: 'user-key', kind: 'user' },
    { ...options, plugins: [mockPlugin] },
    [mockPlugin],
    async (client, logger, testPlatform) => {
      expect(testPlatform.userAgent).toBeDefined();
      expect(testPlatform.version).toBeDefined();
      // Verify getHooks was called with correct environmentMetadata
      expect(mockPlugin.getHooks).toHaveBeenCalledWith({
        sdk: {
          name: testPlatform.userAgent,
          version: testPlatform.version,
          wrapperName: options.wrapperName,
          wrapperVersion: options.wrapperVersion,
        },
        application: {
          id: options.application.id,
          version: options.application.version,
        },
        clientSideId: 'env',
      });

      // Verify register was called with correct environmentMetadata
      expect(mockPlugin.register).toHaveBeenCalledWith(
        expect.any(Object), // client
        {
          sdk: {
            name: testPlatform.userAgent,
            version: testPlatform.version,
            wrapperName: options.wrapperName,
            wrapperVersion: options.wrapperVersion,
          },
          application: {
            id: options.application.id,
            version: options.application.version,
          },
          clientSideId: 'env',
        }
      );
    }
  );
});

it('passes correct environmentMetadata without optional fields', async () => {
  const mockPlugin = createTestPlugin('test-plugin');

  await withClient(
    { key: 'user-key', kind: 'user' },
    { plugins: [mockPlugin] },
    [mockPlugin],
    async (client, logger, testPlatform) => {
      expect(testPlatform.userAgent).toBeDefined();
      expect(testPlatform.version).toBeDefined();
      // Verify getHooks was called with correct environmentMetadata
      expect(mockPlugin.getHooks).toHaveBeenCalledWith({
        sdk: {
          name: testPlatform.userAgent,
          version: testPlatform.version,
        },
        clientSideId: 'env',
      });

      // Verify register was called with correct environmentMetadata
      expect(mockPlugin.register).toHaveBeenCalledWith(
        expect.any(Object), // client
        {
          sdk: {
            name: testPlatform.userAgent,
            version: testPlatform.version,
          },
          clientSideId: 'env',
        }
      );
    }
  );
});
