jest.mock('../InitializationState', () => jest.fn());

import { initialize } from '../index';
import InitializationState from '../InitializationState';
import * as stubPlatform from './stubPlatform';

const createHangingPromise = () =>
  new Promise(() => {
    // never resolves
  });

describe('timeout', () => {
  let ldc;
  let mockGetInitializationPromise;
  let mockGetReadyPromise;
  let logger;

  beforeEach(() => {
    mockGetInitializationPromise = jest.fn();
    mockGetReadyPromise = jest.fn();
    logger = stubPlatform.logger();
    InitializationState.mockImplementation(() => ({
      getInitializationPromise: mockGetInitializationPromise,
      getReadyPromise: mockGetReadyPromise,
      signalFailure: jest.fn(),
    }));
    mockGetInitializationPromise.mockImplementation(createHangingPromise);
    mockGetReadyPromise.mockImplementation(createHangingPromise);
    ({ client: ldc } = initialize(
      'abc',
      { kind: 'user', key: 'test-user' },
      {
        logger: logger,
      },
      {}
    ));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('waitForInitialization times out if initialization does not resolve', async () => {
    const p = ldc.waitForInitialization(1);
    await expect(p).rejects.toThrow(/timed out/);

    // No warnings in this configuration.
    expect(logger.output.warn).toEqual([]);
    expect(logger.output.error).toEqual([
      'waitForInitialization error: LaunchDarklyTimeoutError: waitForInitialization timed out after 1 seconds.',
    ]);
  });

  it('waitForInitialization warns if no timeout is provided', async () => {
    ldc.waitForInitialization();

    expect(logger.output.warn).toEqual([
      'The waitForInitialization function was called without a timeout specified. In a future version a default timeout will be applied.',
    ]);
  });

  it('waitForInitialization warns if timeout is not a number', async () => {
    ldc.waitForInitialization('10');

    // You get two warnings in this case. Which should be fine as you have to go our of your way to get into this situation.
    expect(logger.output.warn).toEqual([
      'The waitForInitialization method was provided with a non-numeric timeout.',
      'The waitForInitialization function was called without a timeout specified. In a future version a default timeout will be applied.',
    ]);
  });

  it('waitForInitialization warns if timeout provided is too high', async () => {
    ldc.waitForInitialization(10);

    expect(logger.output.warn).toEqual([
      'The waitForInitialization function was called with a timeout greater than 5 seconds. We recommend a timeout of 5 seconds or less.',
    ]);
  });

  it('waitForInitialization does not timeout if the initialization promise resolves in the timeout', async () => {
    mockGetInitializationPromise.mockImplementation(() => Promise.resolve('success'));

    const p = ldc.waitForInitialization(5);

    await expect(p).resolves.toEqual('success');

    // No warnings in this configuration.
    expect(logger.output.warn).toEqual([]);
  });
});
