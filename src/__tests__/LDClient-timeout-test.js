import { initialize } from '../index';

jest.mock('../InitializationState', () => jest.fn());

import InitializationState from '../InitializationState';
describe('timeout', () => {
  let ldc;
  let mockGetInitializationPromise;
  let mockGetReadyPromise;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    mockGetInitializationPromise = jest.fn();
    mockGetReadyPromise = jest.fn();

    InitializationState.mockImplementation(() => ({
      getInitializationPromise: mockGetInitializationPromise,
      getReadyPromise: mockGetReadyPromise,
      signalFailure: jest.fn(),
    }));
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

    ({ client: ldc } = initialize('abc', { kind: 'user', key: 'test-user' }, undefined, {}));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('waitForInitialization timeout', async () => {
    const p = ldc.waitForInitialization();
    jest.runAllTimers();

    await expect(p).rejects.toThrow(/waitForInitialization timed out/);
  });

  // TODO: this fails if the above test is active
  it('waitUntilReady timeout', async () => {
    const p = ldc.waitUntilReady();
    jest.runAllTimers();

    await expect(p).rejects.toThrow(/waitUntilReady timed out/);
  });
});
