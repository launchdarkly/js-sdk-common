import * as messages from '../messages';
import Stream from '../Stream';

import { sleepAsync } from 'launchdarkly-js-test-helpers';
import EventSource from './EventSource-mock';
import * as stubPlatform from './stubPlatform';

const noop = () => {};

describe('Stream', () => {
  const baseUrl = 'https://example.com';
  const envName = 'testenv';
  const user = { key: 'me' };
  const encodedUser = 'eyJrZXkiOiJtZSJ9';
  const hash = '012345789abcde';
  const defaultConfig = { streamUrl: baseUrl };
  let logger;
  let platform;

  beforeEach(() => {
    logger = stubPlatform.logger();
    defaultConfig.logger = logger;
    platform = stubPlatform.defaults();
  });

  it('should not throw on EventSource when it does not exist', () => {
    const platform1 = { ...platform };
    delete platform1['eventSourceFactory'];

    const stream = new Stream(platform1, defaultConfig, envName);

    const connect = () => {
      stream.connect(noop);
    };

    expect(connect).not.toThrow(TypeError);
  });

  it('should not throw when calling disconnect without first calling connect', () => {
    const stream = new Stream(platform, defaultConfig, envName);
    const disconnect = () => {
      stream.disconnect(noop);
    };

    expect(disconnect).not.toThrow(TypeError);
  });

  it('connects to EventSource with eval stream URL by default', async () => {
    const stream = new Stream(platform, defaultConfig, envName);
    stream.connect(user, {});

    const created = await platform.testing.expectStream(baseUrl + '/eval/' + envName + '/' + encodedUser);
    expect(created.options).toEqual({});
  });

  it('adds secure mode hash to URL if provided', async () => {
    const stream = new Stream(platform, defaultConfig, envName, null, hash);
    stream.connect(user, {});

    const created = await platform.testing.expectStream(
      baseUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash
    );
    expect(created.options).toEqual({});
  });

  it('falls back to ping stream URL if useReport is true and REPORT is not supported', async () => {
    const config = { ...defaultConfig, useReport: true };
    const stream = new Stream(platform, config, envName);
    stream.connect(user, {});

    const created = await platform.testing.expectStream(baseUrl + '/ping/' + envName);
    expect(created.options).toEqual({});
  });

  it('sends request body if useReport is true and REPORT is supported', async () => {
    const platform1 = { ...platform, eventSourceAllowsReport: true };
    const config = { ...defaultConfig, useReport: true };
    const stream = new Stream(platform1, config, envName);
    stream.connect(user, {});

    const created = await platform.testing.expectStream(baseUrl + '/eval/' + envName);
    expect(created.options.method).toEqual('REPORT');
    expect(JSON.parse(created.options.body)).toEqual(user);
  });

  it('sets event listeners', async () => {
    const stream = new Stream(platform, defaultConfig, envName);
    const fn1 = jest.fn();
    const fn2 = jest.fn();

    stream.connect(user, {
      birthday: fn1,
      anniversary: fn2,
    });

    const created = await platform.testing.expectStream();
    const es = created.eventSource;

    es.mockEmit('birthday');
    expect(fn1).toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();

    es.mockEmit('anniversary');
    expect(fn2).toHaveBeenCalled();
  });

  it('reconnects after encountering an error', async () => {
    const config = { ...defaultConfig, streamReconnectDelay: 1, useReport: false };
    const stream = new Stream(platform, config, envName);
    stream.connect(user);

    const created = await platform.testing.expectStream();
    let es = created.eventSource;

    expect(es.readyState).toBe(EventSource.CONNECTING);
    es.mockOpen();
    expect(es.readyState).toBe(EventSource.OPEN);

    const nAttempts = 5;
    for (let i = 0; i < nAttempts; i++) {
      es.mockError('test error');
      const created1 = await platform.testing.expectStream();
      const es1 = created1.eventSource;

      expect(es.readyState).toBe(EventSource.CLOSED);
      expect(es1.readyState).toBe(EventSource.CONNECTING);

      es1.mockOpen();
      await sleepAsync(0); // make sure the stream logic has a chance to catch up with the new EventSource state

      expect(stream.isConnected()).toBe(true);

      es = es1;
    }
  });

  it('logs a warning for only the first failed connection attempt', async () => {
    const config = { ...defaultConfig, streamReconnectDelay: 1 };
    const stream = new Stream(platform, config, envName);
    stream.connect(user);

    const created = await platform.testing.expectStream();
    let es = created.eventSource;
    es.mockOpen();

    const nAttempts = 5;
    for (let i = 0; i < nAttempts; i++) {
      es.mockError('test error');
      const created1 = await platform.testing.expectStream();
      es = created1.eventSource;
      es.mockOpen();
    }

    // make sure there is just a single logged message rather than five (one per attempt)
    expect(logger.output.warn).toEqual([messages.streamError('test error', 1)]);
  });

  it('logs a warning again after a successful connection', async () => {
    const config = { ...defaultConfig, streamReconnectDelay: 1 };
    const stream = new Stream(platform, config, envName);
    const fakePut = jest.fn();
    stream.connect(user, {
      put: fakePut,
    });

    const created = await platform.testing.expectStream();
    let es = created.eventSource;
    es.mockOpen();

    const nAttempts = 5;
    for (let i = 0; i < nAttempts; i++) {
      es.mockError('test error #1');
      const created1 = await platform.testing.expectStream();
      es = created1.eventSource;
      es.mockOpen();
    }

    // simulate the re-establishment of a successful connection
    es.mockEmit('put', 'something');
    expect(fakePut).toHaveBeenCalled();

    for (let i = 0; i < nAttempts; i++) {
      es.mockError('test error #2');
      const created1 = await platform.testing.expectStream();
      es = created1.eventSource;
      es.mockOpen();
    }

    // make sure there is just a single logged message rather than five (one per attempt)
    expect(logger.output.warn).toEqual([
      messages.streamError('test error #1', 1),
      messages.streamError('test error #2', 1),
    ]);
  });
});
