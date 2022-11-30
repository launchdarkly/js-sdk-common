const { checkContext, getContextKeys, getContextKinds, getCanonicalKey } = require('../context');

describe.each([{ key: 'test' }, { kind: 'user', key: 'test' }, { kind: 'multi', user: { key: 'test' } }])(
  'given a context which contains a single kind',
  context => {
    it('should get the context kind', () => {
      expect(getContextKinds(context)).toEqual(['user']);
    });

    it('should be valid', () => {
      expect(checkContext(context, false)).toBeTruthy();
    });
  }
);

describe('given a valid multi-kind context', () => {
  const context = {
    kind: 'multi',
    user: {
      key: 'user',
    },
    org: {
      key: 'org',
    },
  };

  it('should get a list of the kinds', () => {
    expect(getContextKinds(context).sort()).toEqual(['org', 'user']);
  });

  it('should be valid', () => {
    expect(checkContext(context, false)).toBeTruthy();
  });
});

// A sample of invalid characters.
const invalidSampleChars = [
  ...`#$%&'()*+,/:;<=>?@[\\]^\`{|}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²
³´µ¶·¸¹º»¼½¾¿À汉字`,
];
const badKinds = invalidSampleChars.map(char => ({ kind: char, key: 'test' }));

describe.each([
  {}, // An empty object is not a valid context.
  { key: '' }, // If allowLegacyKey is not true, then this should be invalid.
  { kind: 'kind', key: 'kind' }, // The kind cannot be kind.
  { kind: 'user' }, // The context needs to have a key.
  { kind: 'org', key: '' }, // For a non-legacy context the key cannot be empty.
  { kind: ' ', key: 'test' }, // Kind cannot be whitespace only.
  { kind: 'cat dog', key: 'test' }, // Kind cannot contain whitespace
  { kind: '~!@#$%^&*()_+', key: 'test' }, // Special characters are not valid.
  ...badKinds,
])('given invalid contexts', context => {
  it('should not be valid', () => {
    expect(checkContext(context, false)).toBeFalsy();
  });
});

const validChars = ['0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_.'];
const goodKinds = validChars.map(char => [{ kind: char, key: 'test' }, false]);

describe.each([
  [{ key: '' }, true], // Allow a legacy context with an empty key.
  ...goodKinds,
])('given valid contexts', (context, allowLegacyKey) => {
  it('should be valid and can get context kinds', () => {
    expect(checkContext(context, allowLegacyKey)).toBeTruthy();
    expect(getContextKinds(context)).toEqual([context.kind || 'user']);
  });
});

describe('when determining canonical keys', () => {
  it.each([
    [{ key: 'test' }, 'test'],
    [{ kind: 'user', key: 'test' }, 'test'],
    [{ kind: 'org', key: 'orgtest' }, 'org:orgtest'],
    [{ kind: 'multi', user: { key: 'usertest' } }, 'user:usertest'],
    [{ kind: 'multi', user: { key: 'usertest' }, org: { key: 'orgtest' } }, 'org:orgtest:user:usertest'],
    [{ kind: 'multi', user: { key: 'user:test' }, org: { key: 'org:test' } }, 'org:org%3Atest:user:user%3Atest'],
    [{ kind: 'multi', user: { key: 'user%test' }, org: { key: 'org%test' } }, 'org:org%25test:user:user%25test'],
    [
      { kind: 'multi', user: { key: 'user%:test' }, org: { key: 'org%:test' } },
      'org:org%25%3Atest:user:user%25%3Atest',
    ],
  ])('produces a canonical key for valid  contexts', (context, canonicalKey) => {
    expect(getCanonicalKey(context)).toEqual(canonicalKey);
  });

  it('does not break with an null/undefined context', () => {
    expect(getCanonicalKey(undefined)).toBeUndefined();
    expect(getCanonicalKey(null)).toBeUndefined();
  });
});

describe('getContextKeys', () => {
  it('returns undefined if argument is undefined', () => {
    const context = undefined;
    const keys = getContextKeys(context);
    expect(keys).toBeUndefined();
  });

  it('works with legacy user without kind attribute', () => {
    const user = {
      key: 'legacy-user-key',
      name: 'Test User',
      custom: {
        customAttribute1: true,
      },
    };
    const keys = getContextKeys(user);
    expect(keys).toEqual({ user: 'legacy-user-key' });
  });

  it('gets keys from multi context', () => {
    const context = {
      kind: 'multi',
      user: {
        key: 'test-user-key',
        name: 'Test User',
        isPremiumCustomer: true,
      },
      organization: {
        key: 'test-organization-key',
        name: 'Test Company',
        industry: 'technology',
      },
    };
    const keys = getContextKeys(context);
    expect(keys).toEqual({ user: 'test-user-key', organization: 'test-organization-key' });
  });

  it('ignores undefined keys from multi context', () => {
    const context = {
      kind: 'multi',
      user: {
        key: 'test-user-key',
        name: 'Test User',
        isPremiumCustomer: true,
      },
      organization: {
        name: 'Test Company',
        industry: 'technology',
      },
      rogueAttribute: undefined,
    };
    const keys = getContextKeys(context);
    expect(keys).toEqual({ user: 'test-user-key' });
  });

  it.only('ignores empty string and null keys from multi context', () => {
    const context = {
      kind: 'multi',
      user: {
        key: 'test-user-key',
        name: 'Test User',
        isPremiumCustomer: true,
      },
      organization: {
        key: '',
        name: 'Test Company',
        industry: 'technology',
      },
      drone: {
        key: null,
        name: 'test-drone',
      },
    };
    const keys = getContextKeys(context);
    expect(keys).toEqual({ user: 'test-user-key' });
  });

  it('gets keys from single context', () => {
    const context = {
      kind: 'drone',
      key: 'test-drone-key',
      name: 'test-drone',
    };
    const keys = getContextKeys(context);
    expect(keys).toEqual({ drone: 'test-drone-key' });
  });

  it('ignores kind when it is an empty string', () => {
    const context = {
      kind: '',
      key: 'test-drone-key',
      name: 'test-drone',
    };
    const keys = getContextKeys(context);
    expect(keys).toEqual({});
  });

  it('ignores kind when it is null', () => {
    const context = {
      kind: null,
      key: 'test-drone-key',
      name: 'test-drone',
    };
    const keys = getContextKeys(context);
    expect(keys).toEqual({});
  });
});
