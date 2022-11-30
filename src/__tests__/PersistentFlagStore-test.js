import * as stubPlatform from './stubPlatform';

import * as messages from '../messages';
import Identity from '../Identity';
import PersistentFlagStore from '../PersistentFlagStore';
import PersistentStorage from '../PersistentStorage';
import * as utils from '../utils';

describe('PersistentFlagStore', () => {
  const context = { key: 'context-key', kind: 'user' };
  const ident = Identity(context);
  const env = 'ENVIRONMENT';
  const lsKey = 'ld:' + env + ':' + utils.btoa(JSON.stringify(context));

  it('stores flags', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);

    const flags = { flagKey: { value: 'x' } };

    await store.saveFlags(flags);

    const value = platform.testing.getLocalStorageImmediately(lsKey);
    const expected = { $schema: 1, ...flags };
    expect(JSON.parse(value)).toEqual(expected);
  });

  it('retrieves and parses flags', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);

    const expected = { flagKey: { value: 'x' } };
    const stored = { $schema: 1, ...expected };
    platform.testing.setLocalStorageImmediately(lsKey, JSON.stringify(stored));

    const values = await store.loadFlags();
    expect(values).toEqual(expected);
  });

  it('converts flags from old format if schema property is missing', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);

    const oldFlags = { flagKey: 'x' };
    const newFlags = { flagKey: { value: 'x', version: 0 } };
    platform.testing.setLocalStorageImmediately(lsKey, JSON.stringify(oldFlags));

    const values = await store.loadFlags();
    expect(values).toEqual(newFlags);
  });

  it('returns null if storage is empty', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);

    const values = await store.loadFlags();
    expect(values).toBe(null);
  });

  it('clears storage and returns null if value is not valid JSON', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);

    platform.testing.setLocalStorageImmediately(lsKey, '{bad');

    expect(await store.loadFlags()).toBe(null);

    expect(platform.testing.getLocalStorageImmediately(lsKey)).toBe(undefined);
  });

  it('uses hash, if present, instead of context properties', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const hash = '12345';
    const keyWithHash = 'ld:' + env + ':' + hash;
    const store = PersistentFlagStore(storage, env, hash, ident, platform.testing.logger);

    const flags = { flagKey: { value: 'x' } };
    await store.saveFlags(flags);

    const value = platform.testing.getLocalStorageImmediately(keyWithHash);
    expect(JSON.parse(value)).toEqual({ $schema: 1, ...flags });
  });

  it('should handle localStorage.get returning an error', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);
    const myError = new Error('localstorage getitem error');
    jest.spyOn(platform.localStorage, 'get').mockImplementation(() => Promise.reject(myError));

    expect(await store.loadFlags()).toBe(null);
    expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable(myError)]);
  });

  it('should handle localStorage.set returning an error', async () => {
    const platform = stubPlatform.defaults();
    const storage = PersistentStorage(platform.localStorage, platform.testing.logger);
    const store = PersistentFlagStore(storage, env, '', ident, platform.testing.logger);
    const myError = new Error('localstorage setitem error');
    jest.spyOn(platform.localStorage, 'set').mockImplementation(() => Promise.reject(myError));

    await store.saveFlags({ foo: {} });
    expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable(myError)]);
  });
});
