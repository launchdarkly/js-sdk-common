const { AsyncQueue } = require('launchdarkly-js-test-helpers');
const { respondJson } = require('./mockHttp');
const stubPlatform = require('./stubPlatform');

const envName = 'UNKNOWN_ENVIRONMENT_ID';
const context = { key: 'context-key' };

describe('given a streaming client with registered inspectors', () => {
  const eventQueue = new AsyncQueue();

  const inspectors = [
    {
      type: 'flag-used',
      method: (flagKey, flagDetail, context) => {
        eventQueue.add({ type: 'flag-used', flagKey, flagDetail, context });
      },
    },
    // 'flag-used registered twice.
    {
      type: 'flag-used',
      method: (flagKey, flagDetail, context) => {
        eventQueue.add({ type: 'flag-used', flagKey, flagDetail, context });
      },
    },
    {
      type: 'flag-details-changed',
      method: details => {
        eventQueue.add({
          type: 'flag-details-changed',
          details,
        });
      },
    },
    {
      type: 'flag-detail-changed',
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
    server.byDefault(respondJson({}));
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
      details: {},
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
});
