const { AsyncQueue } = require('launchdarkly-js-test-helpers');
const { respondJson } = require('./mockHttp');
const stubPlatform = require('./stubPlatform');

const envName = 'UNKNOWN_ENVIRONMENT_ID';
const context = { key: 'context-key' };

const flagPayload = {
  'is-prereq': {
    value: true,
    variation: 1,
    reason: {
      kind: 'FALLTHROUGH',
    },
    version: 1,
    trackEvents: true,
    trackReason: true,
  },
  'has-prereq-depth-1': {
    value: true,
    variation: 0,
    prerequisites: ['is-prereq'],
    reason: {
      kind: 'FALLTHROUGH',
    },
    version: 4,
    trackEvents: true,
    trackReason: true,
  },
  'has-prereq-depth-2': {
    value: true,
    variation: 0,
    prerequisites: ['has-prereq-depth-1'],
    reason: {
      kind: 'FALLTHROUGH',
    },
    version: 5,
    trackEvents: true,
    trackReason: true,
  },
};

describe.each([true, false])('given a streaming client with registered inspectors, synchronous: %p', synchronous => {
  const eventQueue = new AsyncQueue();

  const inspectors = [
    {
      type: 'flag-used',
      synchronous,
      method: (flagKey, flagDetail, context) => {
        eventQueue.add({ type: 'flag-used', flagKey, flagDetail, context });
      },
    },
    // 'flag-used registered twice.
    {
      type: 'flag-used',
      synchronous,
      method: (flagKey, flagDetail, context) => {
        eventQueue.add({ type: 'flag-used', flagKey, flagDetail, context });
      },
    },
    {
      type: 'flag-details-changed',
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
      synchronous,
      method: context => {
        eventQueue.add({
          type: 'client-identity-changed',
          context,
        });
      },
    },
  ];

  let client;
  let platform;

  beforeEach(async () => {
    platform = stubPlatform.defaults();
    const server = platform.testing.http.newServer();
    server.byDefault(respondJson(flagPayload));
    const config = { streaming: true, baseUrl: server.url, inspectors, sendEvents: false };
    client = platform.testing.makeClient(envName, context, config);
    await client.waitUntilReady();
  });

  afterEach(() => {
    expect(eventQueue.length()).toEqual(0);
  });

  afterAll(() => {
    eventQueue.close();
  });

  afterEach(async () => {
    await client.close();
  });

  it('has an initial identify event and flag payload', async () => {
    // These events cover the initial identify and a polling response.
    const ident = await eventQueue.take();
    expect(ident).toMatchObject({
      type: 'client-identity-changed',
      context,
    });
    const flagsEvent = await eventQueue.take();
    expect(flagsEvent).toMatchObject({
      type: 'flag-details-changed',
      details: {
        'is-prereq': {
          value: true,
          variationIndex: 1,
          reason: {
            kind: 'FALLTHROUGH',
          },
        },
        'has-prereq-depth-1': {
          value: true,
          variationIndex: 0,
          reason: {
            kind: 'FALLTHROUGH',
          },
        },
        'has-prereq-depth-2': {
          value: true,
          variationIndex: 0,
          reason: {
            kind: 'FALLTHROUGH',
          },
        },
      },
    });
  });

  it('emits an event for the stream put replacing all flags', async () => {
    // Take initial events.
    eventQueue.take();
    eventQueue.take();

    const stream = await platform.testing.eventSourcesCreated.take();
    stream.eventSource.mockEmit('put', {
      data: '{"flagKey":{"value":true,"version":1}}',
    });
    const updateEvent = await eventQueue.take();
    expect(updateEvent).toMatchObject({
      type: 'flag-details-changed',
      details: {
        flagKey: { value: true },
      },
    });
  });

  it('emits an event for a stream patch changing a flag', async () => {
    // Take initial events.
    eventQueue.take();
    eventQueue.take();

    const stream = await platform.testing.eventSourcesCreated.take();
    stream.eventSource.mockEmit('patch', {
      data: '{"key": "flagKey", "value":false,"version":2}',
    });
    const updateEvent = await eventQueue.take();
    expect(updateEvent).toMatchObject({
      type: 'flag-detail-changed',
      flagKey: 'flagKey',
      flagDetail: { value: false },
    });
  });

  it('emits an event when a flag is used', async () => {
    // Take initial events.
    eventQueue.take();
    eventQueue.take();

    await platform.testing.eventSourcesCreated.take();
    client.variation('is-prereq', false);
    const updateEvent = await eventQueue.take();
    expect(updateEvent).toMatchObject({
      type: 'flag-used',
      flagKey: 'is-prereq',
      flagDetail: { value: true },
    });
    // Two inspectors are handling this
    const updateEvent2 = await eventQueue.take();
    expect(updateEvent2).toMatchObject({
      type: 'flag-used',
      flagKey: 'is-prereq',
      flagDetail: { value: true },
    });
  });

  it('does not execute flag-used for prerequisites', async () => {
    // Take initial events.
    eventQueue.take();
    eventQueue.take();

    await platform.testing.eventSourcesCreated.take();
    client.variation('has-prereq-depth-2', false);
    // There would be many more than 2 events if prerequisites were inspected.
    const updateEvent = await eventQueue.take();
    expect(updateEvent).toMatchObject({
      type: 'flag-used',
      flagKey: 'has-prereq-depth-2',
      flagDetail: { value: true },
    });
    // Two inspectors are handling this
    const updateEvent2 = await eventQueue.take();
    expect(updateEvent2).toMatchObject({
      type: 'flag-used',
      flagKey: 'has-prereq-depth-2',
      flagDetail: { value: true },
    });

    expect(eventQueue.length()).toEqual(0);
  });
});
