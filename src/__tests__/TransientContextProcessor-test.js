import AnonymousContextProcessor from '../AnonymousContextProcessor';

describe('AnonymousContextProcessor', () => {
  let localStorage;
  let logger;
  let uv;

  beforeEach(() => {
    localStorage = {};
    logger = {
      warn: jest.fn(),
    };
    uv = new AnonymousContextProcessor(localStorage, logger);
  });

  it('rejects null user', async () => {
    await expect(uv.processContext(null)).rejects.toThrow();
  });

  it('leaves user with string key unchanged', async () => {
    const u = { key: 'someone', name: 'me' };
    expect(await uv.processContext(u)).toEqual(u);
  });

  it('stringifies non-string key', async () => {
    const u0 = { key: 123, name: 'me' };
    const u1 = { key: '123', name: 'me' };
    expect(await uv.processContext(u0)).toEqual(u1);
  });

  it('uses cached key for anonymous user', async () => {
    const cachedKey = 'thing';
    let storageKey;
    localStorage.get = async key => {
      storageKey = key;
      return cachedKey;
    };
    const u = { anonymous: true };
    expect(await uv.processContext(u)).toEqual({ key: cachedKey, anonymous: true });
    expect(storageKey).toEqual('ld:$anonUserId');
  });

  it('generates and stores key for anonymous user', async () => {
    let storageKey;
    let storedValue;
    localStorage.get = async () => null;
    localStorage.set = async (key, value) => {
      storageKey = key;
      storedValue = value;
    };
    const u0 = { anonymous: true };
    const u1 = await uv.processContext(u0);
    expect(storedValue).toEqual(expect.anything());
    expect(u1).toEqual({ key: storedValue, anonymous: true });
    expect(storageKey).toEqual('ld:$anonUserId');
  });

  it('generates and stores a key for each anonymous context in a multi-kind context', async () => {
    const context = {
      kind: 'multi',
      user: { anonymous: true },
      org: { anonymous: true },
      app: { key: 'app' },
    };

    const storage = {};
    localStorage.get = async key => storage[key];
    localStorage.set = async (key, value) => {
      storage[key] = value;
    };

    const processed = await uv.processContext(context);
    expect(processed.user.key).toBeDefined();
    expect(processed.user.key).not.toEqual(processed.org.key);
    expect(processed.org.key).toBeDefined();
    expect(processed.app.key).toEqual('app');
  });

  it('uses cached keys for context kinds that have already been generated', async () => {
    const context = {
      kind: 'multi',
      user: { anonymous: true },
      org: { anonymous: true },
      another: { anonymous: true },
      app: { key: 'app' },
    };

    const storage = {
      'ld:$contextKey:org': 'cachedOrgKey',
      'ld:$anonUserId': 'cachedUserKey',
    };
    localStorage.get = async key => storage[key];
    localStorage.set = async (key, value) => {
      storage[key] = value;
    };

    const processed = await uv.processContext(context);
    expect(processed.user.key).toEqual('cachedUserKey');
    expect(processed.org.key).toEqual('cachedOrgKey');
    expect(processed.another.key).toBeDefined();
    expect(processed.app.key).toEqual('app');
  });

  it.each([{ anonymous: true }, { kind: 'user', anonymous: true }, { kind: 'multi', user: { anonymous: true } }])(
    'uses the same key to store any user context (legacy, single, multi)',
    async context => {
      const storage = {};
      localStorage.get = async key => expect(key).toEqual('ld:$anonUserId');
      localStorage.set = async (key, value) => {
        storage[key] = value;
      };
      await uv.processContext(context);
    }
  );
});
