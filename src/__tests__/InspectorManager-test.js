const { AsyncQueue } = require('launchdarkly-js-test-helpers');
const { InspectorTypes, InspectorManager } = require('../InspectorManager');
const stubPlatform = require('./stubPlatform');

describe('given an inspector manager with no registered inspectors', () => {
  const platform = stubPlatform.defaults();
  const manager = InspectorManager([], platform.testing.logger);

  it('does not cause errors', () => {
    manager.onIdentityChanged({ key: 'key' });
    manager.onFlagUsed(
      'flag-key',
      {
        value: null,
      },
      { key: 'key' }
    );
    manager.onFlags({});
    manager.onFlagChanged('flag-key', { value: null });
  });

  it('does not report any registered listeners', () => {
    expect(manager.hasListeners(InspectorTypes.clientIdentityChanged)).toBeFalsy();
    expect(manager.hasListeners(InspectorTypes.flagDetailChanged)).toBeFalsy();
    expect(manager.hasListeners(InspectorTypes.flagDetailsChanged)).toBeFalsy();
    expect(manager.hasListeners(InspectorTypes.flagUsed)).toBeFalsy();
    expect(manager.hasListeners('potato')).toBeFalsy();
  });
});

describe.each([true, false])('given an inspector with callbacks of every type: synchronous: %p', synchronous => {
  /**
   * @type {AsyncQueue}
   */
  const eventQueue = new AsyncQueue();
  const platform = stubPlatform.defaults();
  const manager = InspectorManager(
    [
      {
        type: 'flag-used',
        name: 'my-flag-used-inspector',
        synchronous,
        method: (flagKey, flagDetail, context) => {
          eventQueue.add({ type: 'flag-used', flagKey, flagDetail, context });
        },
      },
      // 'flag-used registered twice.
      {
        type: 'flag-used',
        name: 'my-other-flag-used-inspector',
        synchronous,
        method: (flagKey, flagDetail, context) => {
          eventQueue.add({ type: 'flag-used', flagKey, flagDetail, context });
        },
      },
      {
        type: 'flag-details-changed',
        name: 'my-flag-details-inspector',
        synchronous,
        method: details => {
          eventQueue.add({
            type: 'flag-details-changed',
            details,
          });
        },
      },
      {
        type: 'flag-detail-changed',
        name: 'my-flag-detail-inspector',
        synchronous,
        method: (flagKey, flagDetail) => {
          eventQueue.add({
            type: 'flag-detail-changed',
            flagKey,
            flagDetail,
          });
        },
      },
      {
        type: 'client-identity-changed',
        name: 'my-identity-inspector',
        synchronous,
        method: context => {
          eventQueue.add({
            type: 'client-identity-changed',
            context,
          });
        },
      },
      // Invalid inspector shouldn't have an effect.
      {
        type: 'potato',
        synchronous,
        name: 'my-potato-inspector',
        method: () => {},
      },
    ],
    platform.testing.logger
  );

  afterEach(() => {
    expect(eventQueue.length()).toEqual(0);
  });

  afterAll(() => {
    eventQueue.close();
  });

  it('logged that there was a bad inspector', () => {
    expect(platform.testing.logger.output.warn).toEqual([
      'an inspector: "my-potato-inspector" of an invalid type (potato) was configured',
    ]);
  });

  it('reports any registered listeners', () => {
    expect(manager.hasListeners(InspectorTypes.clientIdentityChanged)).toBeTruthy();
    expect(manager.hasListeners(InspectorTypes.flagDetailChanged)).toBeTruthy();
    expect(manager.hasListeners(InspectorTypes.flagDetailsChanged)).toBeTruthy();
    expect(manager.hasListeners(InspectorTypes.flagUsed)).toBeTruthy();
    expect(manager.hasListeners('potato')).toBeFalsy();
  });

  it('executes `onFlagUsed` handlers', async () => {
    manager.onFlagUsed(
      'flag-key',
      {
        value: 'test',
        variationIndex: 1,
        reason: {
          kind: 'OFF',
        },
      },
      { key: 'test-key' }
    );

    const expectedEvent = {
      type: 'flag-used',
      flagKey: 'flag-key',
      flagDetail: {
        value: 'test',
        variationIndex: 1,
        reason: {
          kind: 'OFF',
        },
      },
      context: { key: 'test-key' },
    };
    const event1 = await eventQueue.take();
    expect(event1).toMatchObject(expectedEvent);

    // There are two handlers, so there should be another event.
    const event2 = await eventQueue.take();
    expect(event2).toMatchObject(expectedEvent);
  });

  it('executes `onFlags` handler', async () => {
    manager.onFlags({
      example: { value: 'a-value' },
    });

    const event = await eventQueue.take();
    expect(event).toMatchObject({
      type: 'flag-details-changed',
      details: {
        example: { value: 'a-value' },
      },
    });
  });

  it('executes `onFlagChanged` handler', async () => {
    manager.onFlagChanged('the-flag', { value: 'a-value' });

    const event = await eventQueue.take();
    expect(event).toMatchObject({
      type: 'flag-detail-changed',
      flagKey: 'the-flag',
      flagDetail: {
        value: 'a-value',
      },
    });
  });

  it('executes `onIdentityChanged` handler', async () => {
    manager.onIdentityChanged({ key: 'the-key' });

    const event = await eventQueue.take();
    expect(event).toMatchObject({
      type: 'client-identity-changed',
      context: { key: 'the-key' },
    });
  });
});
