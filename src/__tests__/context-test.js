const { checkContext, getContextKeys, getContextKinds, getCanonicalKey, hashContext } = require('../context');

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

  it('ignores empty string and null keys from multi context', () => {
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

function mockHasher() {
  let state = '';
  return {
    update: input => {
      state += input;
    },
    digest: () => state,
  };
}

it('hashes two equal contexts the same', async () => {
  const a = {
    kind: 'multi',
    org: {
      key: 'testKey',
      name: 'testName',
      cat: 'calico',
      dog: 'lab',
      anonymous: true,
      _meta: {
        privateAttributes: ['/a/b/c', 'cat', 'custom/dog'],
      },
    },
    customer: {
      key: 'testKey',
      name: 'testName',
      bird: 'party parrot',
      chicken: 'hen',
    },
  };

  const b = {
    kind: 'multi',
    org: {
      key: 'testKey',
      name: 'testName',
      cat: 'calico',
      dog: 'lab',
      anonymous: true,
      _meta: {
        privateAttributes: ['/a/b/c', 'cat', 'custom/dog'],
      },
    },
    customer: {
      key: 'testKey',
      name: 'testName',
      bird: 'party parrot',
      chicken: 'hen',
    },
  };
  expect(await hashContext(a, mockHasher())).toEqual(await hashContext(b, mockHasher()));
});

it('handles shared references without getting stuck', async () => {
  const sharedObject = { value: 'shared' };
  const context = {
    kind: 'multi',
    org: {
      key: 'testKey',
      shared: sharedObject,
    },
    user: {
      key: 'testKey',
      shared: sharedObject,
    },
  };

  const hash = await hashContext(context, mockHasher());
  expect(hash).toBeDefined();
});

it('returns undefined for contexts with cycles', async () => {
  const cyclicObject = { value: 'cyclic' };
  cyclicObject.self = cyclicObject;

  const context = {
    kind: 'user',
    key: 'testKey',
    cyclic: cyclicObject,
  };

  expect(await hashContext(context, mockHasher())).toBeUndefined();
});

it('handles nested objects correctly', async () => {
  const context = {
    kind: 'user',
    key: 'testKey',
    nested: {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    },
  };

  const hash = await hashContext(context, mockHasher());
  expect(hash).toBeDefined();
});

it('handles arrays correctly', async () => {
  const context = {
    kind: 'user',
    key: 'testKey',
    array: [1, 2, 3],
    nestedArray: [
      [1, 2],
      [3, 4],
    ],
  };

  const hash = await hashContext(context, mockHasher());
  expect(hash).toBeDefined();
});

it('handles primitive values correctly', async () => {
  const context = {
    kind: 'user',
    key: 'testKey',
    string: 'test',
    number: 42,
    boolean: true,
    nullValue: null,
    undefinedValue: undefined,
  };

  const hash = await hashContext(context, mockHasher());
  expect(hash).toBeDefined();
});

it('includes private attributes in hash calculation', async () => {
  const baseContext = {
    kind: 'user',
    key: 'testKey',
    name: 'testName',
    nested: {
      value: 'testValue',
    },
  };

  const contextWithPrivate = {
    ...baseContext,
    _meta: {
      privateAttributes: ['name', 'nested/value'],
    },
  };

  const hashWithPrivate = await hashContext(contextWithPrivate, mockHasher());
  const hashWithoutPrivate = await hashContext(baseContext, mockHasher());

  // The hashes should be different because private attributes are included in the hash
  expect(hashWithPrivate).not.toEqual(hashWithoutPrivate);
});

it('uses the keys of attributes in the hash', async () => {
  const a = {
    kind: 'user',
    key: 'testKey',
    a: 'b',
  };

  const b = {
    kind: 'user',
    key: 'testKey',
    b: 'b',
  };

  const hashA = await hashContext(a, mockHasher());
  const hashB = await hashContext(b, mockHasher());
  expect(hashA).not.toBe(hashB);
});

it('uses the keys of nested objects inside the hash', async () => {
  const a = {
    kind: 'user',
    key: 'testKey',
    nested: {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    },
  };

  const b = {
    kind: 'user',
    key: 'testKey',
    nested: {
      sub1: {
        sub2: {
          value: 'deep',
        },
      },
    },
  };

  const hashA = await hashContext(a, mockHasher());
  const hashB = await hashContext(b, mockHasher());
  expect(hashA).not.toBe(hashB);
});

it('uses the values of nested array in calculations', async () => {
  const a = {
    kind: 'user',
    key: 'testKey',
    array: [1, 2, 3],
    nestedArray: [
      [1, 2],
      [3, 4],
    ],
  };

  const b = {
    kind: 'user',
    key: 'testKey',
    array: [1, 2, 3],
    nestedArray: [
      [2, 1],
      [3, 4],
    ],
  };

  const hashA = await hashContext(a, mockHasher());
  const hashB = await hashContext(b, mockHasher());
  expect(hashA).not.toBe(hashB);
});

it('uses the values of nested objects inside the hash', async () => {
  const a = {
    kind: 'user',
    key: 'testKey',
    nested: {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    },
  };

  const b = {
    kind: 'user',
    key: 'testKey',
    nested: {
      level1: {
        level2: {
          value: 'deeper',
        },
      },
    },
  };

  const hashA = await hashContext(a, mockHasher());
  const hashB = await hashContext(b, mockHasher());
  expect(hashA).not.toBe(hashB);
});

it('hashes _meta in attributes', async () => {
  const a = {
    kind: 'user',
    key: 'testKey',
    nested: {
      level1: {
        level2: {
          _meta: { test: 'a' },
        },
      },
    },
  };

  const b = {
    kind: 'user',
    key: 'testKey',
    nested: {
      level1: {
        level2: {
          _meta: { test: 'b' },
        },
      },
    },
  };

  const hashA = await hashContext(a, mockHasher());
  const hashB = await hashContext(b, mockHasher());
  expect(hashA).not.toBe(hashB);
});

it('produces the same value for the given context', async () => {
  // This isn't so much a test as it is a detection of change.
  // If this test failed, and you didn't expect it, then you probably need to make sure your
  // change makes sense.
  const complexContext = {
    kind: 'multi',
    org: {
      key: 'testKey',
      name: 'testName',
      cat: 'calico',
      dog: 'lab',
      anonymous: true,
      nestedArray: [
        [1, 2],
        [3, 4],
      ],
      _meta: {
        privateAttributes: ['/a/b/c', 'cat', 'custom/dog'],
      },
    },
    customer: {
      key: 'testKey',
      name: 'testName',
      bird: 'party parrot',
      chicken: 'hen',
      nested: {
        level1: {
          level2: {
            value: 'deep',
            _meta: { thisShouldBeInTheHash: true },
          },
        },
      },
    },
  };
  expect(await hashContext(complexContext, mockHasher())).toBe(
    '{"customer":{"bird":"party parrot","chicken":"hen","key":"testKey","name":"testName","nested":{"level1":{"level2":{"_meta":{"thisShouldBeInTheHash":true},"value":"deep"}}}},"kind":"multi","org":{"_meta":{"privateAttributes":["/a/b/c","cat","custom/dog"]},"anonymous":true,"cat":"calico","dog":"lab","key":"testKey","name":"testName","nestedArray":[[1,2],[3,4]]}}'
  );
});
