jest.mock('../InitializationState', () => jest.fn());
jest.mock('../timedPromise', () => jest.fn());

import { initialize } from '../index';
import InitializationState from '../InitializationState';
import timedPromise from '../timedPromise';

const createHangingPromise = () =>
  new Promise(() => {
    // never resolves
  });

describe('timeout', () => {
  let ldc;
  let mockGetInitializationPromise;
  let mockGetReadyPromise;

  beforeEach(() => {
    mockGetInitializationPromise = jest.fn();
    mockGetReadyPromise = jest.fn();
    timedPromise.mockImplementation(() => Promise.reject(new Error('timed out')));
    InitializationState.mockImplementation(() => ({
      getInitializationPromise: mockGetInitializationPromise,
      getReadyPromise: mockGetReadyPromise,
      signalFailure: jest.fn(),
    }));
    mockGetInitializationPromise.mockImplementation(createHangingPromise);
    mockGetReadyPromise.mockImplementation(createHangingPromise);
    ({ client: ldc } = initialize('abc', { kind: 'user', key: 'test-user' }, undefined, {}));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('waitForInitialization timeout', async () => {
    const p = ldc.waitForInitialization();
    await expect(p).rejects.toThrow(/timed out/);
  });

  it('waitForInitialization succeeds', async () => {
    timedPromise.mockImplementation(createHangingPromise);
    mockGetInitializationPromise.mockImplementation(() => Promise.resolve('success'));

    const p = ldc.waitForInitialization();

    await expect(p).resolves.toEqual('success');
  });

  it('waitForInitialization succeeds with custom timeout', async () => {
    timedPromise.mockImplementation(createHangingPromise);
    mockGetInitializationPromise.mockImplementation(() => Promise.resolve('success'));

    const p = ldc.waitForInitialization(10);

    await expect(p).resolves.toEqual('success');
    expect(timedPromise).toBeCalledWith(10, 'waitForInitialization');
  });

  it('waitUntilReady timeout', async () => {
    const p = ldc.waitUntilReady();
    await expect(p).rejects.toThrow(/timed out/);
  });

  it('waitUntilReady succeeds', async () => {
    timedPromise.mockImplementation(createHangingPromise);
    mockGetReadyPromise.mockImplementation(() => Promise.resolve('success'));

    const p = ldc.waitUntilReady();

    await expect(p).resolves.toEqual('success');
  });

  it('waitUntilReady succeeds with custom timeout', async () => {
    timedPromise.mockImplementation(createHangingPromise);
    mockGetReadyPromise.mockImplementation(() => Promise.resolve('success'));

    const p = ldc.waitUntilReady(10);

    await expect(p).resolves.toEqual('success');
    expect(timedPromise).toBeCalledWith(10, 'waitUntilReady');
  });
});
