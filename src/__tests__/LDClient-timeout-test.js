jest.mock('../InitializationState', () => jest.fn());

describe('timeout', () => {
  let mockGetInitializationPromise;
  let mockGetReadyPromise;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    mockGetInitializationPromise = jest.fn();
    mockGetReadyPromise = jest.fn();

    mockGetInitializationPromise.mockImplementation(
      () =>
        new Promise(() => {
          // mock an init that never resolves
        })
    );
    mockGetReadyPromise.mockImplementation(
      () =>
        new Promise(() => {
          // mock a ready promise never resolves
        })
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('waitForInitialization timeout', async () => {
    jest.isolateModules(async () => {
      jest.doMock('../InitializationState', () =>
        jest.fn(() => ({
          getInitializationPromise: mockGetInitializationPromise,
          getReadyPromise: mockGetReadyPromise,
          signalFailure: jest.fn(),
        }))
      );
      const { initialize } = require('../index');
      const { client } = initialize('abc', { kind: 'user', key: 'test-user' }, undefined, {});
      const p = client.waitForInitialization();
      jest.runAllTimers();

      await expect(p).rejects.toThrow(/waitForInitialization timed out/);
    });
  });

  it('waitForInitialization success', async () => {
    jest.isolateModules(async () => {
      jest.doMock('../InitializationState', () =>
        jest.fn(() => ({
          getInitializationPromise: () => Promise.resolve('waitForInitialization success'),
          getReadyPromise: mockGetReadyPromise,
          signalFailure: jest.fn(),
        }))
      );
      const { initialize } = require('../index');
      const { client } = initialize('abc', { kind: 'user', key: 'test-user' }, undefined, {});
      const p = client.waitForInitialization();
      jest.runAllTimers();

      await expect(p).resolves.toEqual('waitForInitialization success');
    });
  });

  it('waitUntilReady timeout', async () => {
    jest.isolateModules(async () => {
      jest.doMock('../InitializationState', () =>
        jest.fn(() => ({
          getInitializationPromise: mockGetInitializationPromise,
          getReadyPromise: mockGetReadyPromise,
          signalFailure: jest.fn(),
        }))
      );
      const { initialize } = require('../index');
      const { client } = initialize('abc', { kind: 'user', key: 'test-user' }, undefined, {});
      const p = client.waitUntilReady();
      jest.runAllTimers();

      await expect(p).rejects.toThrow(/waitUntilReady timed out/);
    });
  });

  it('waitUntilReady success', async () => {
    jest.isolateModules(async () => {
      jest.doMock('../InitializationState', () =>
        jest.fn(() => ({
          getInitializationPromise: mockGetInitializationPromise,
          getReadyPromise: () => Promise.resolve('waitUntilReady success'),
          signalFailure: jest.fn(),
        }))
      );
      const { initialize } = require('../index');
      const { client } = initialize('abc', { kind: 'user', key: 'test-user' }, undefined, {});
      const p = client.waitUntilReady();
      jest.runAllTimers();

      await expect(p).resolves.toEqual('waitUntilReady success');
    });
  });
});
