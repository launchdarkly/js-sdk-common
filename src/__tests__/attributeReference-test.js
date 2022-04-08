const AttributeReference = require('../attributeReference');

describe('when filtering attributes by reference', () => {
  it('should be able to remove a top level value', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['ld']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual(['/ld']);
  });

  it('should be able to exclude a nested value', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['/launchdarkly/u2c']
    );
    expect(cloned).toEqual({
      launchdarkly: {},
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual(['/launchdarkly/u2c']);
  });

  it('sould be able to exclude an object', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['launchdarkly']
    );
    expect(cloned).toEqual({
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual(['/launchdarkly']);
  });

  it('sould be able to exclude an array', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['foo']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual(['/foo']);
  });

  it('should not allow exclude an array index', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['foo/0']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual([]);
  });

  it('should not allow exclude a property inside an index of an array.', () => {
    const objWithArrayOfObjects = {
      array: [
        {
          toRemove: true,
          toLeave: true,
        },
      ],
    };

    const { cloned, excluded } = AttributeReference.cloneExcluding(objWithArrayOfObjects, ['array/0/toRemove']);
    expect(cloned).toEqual(objWithArrayOfObjects);
    expect(excluded).toEqual([]);
  });

  it('should not allow exclude the root object', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['/']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual([]);
  });

  it('should allow exclude a null value', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['null']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
    });
    expect(excluded).toEqual(['/null']);
  });

  it('should not allow exclude a value inside null', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['/null/null']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual([]);
  });

  it('should not allow exclude a value inside explicit undefined', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['undefined/null']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual([]);
  });

  it('should allow removing an explicit undefined value', () => {
    const objToClone = { undefined: undefined };
    const { cloned, excluded } = AttributeReference.cloneExcluding(objToClone, ['undefined']);
    expect(cloned).toEqual({});
    expect(excluded).toEqual(['/undefined']);
  });

  it('should allow removing references with escape characters', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['/a~1b', '/m~0n']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual(['/a~1b', '/m~0n']);
  });

  it('should allow removing literals without escape characters', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      ['a/b', 'm~n']
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual(['/a~1b', '/m~0n']);
  });

  it('should handle cycles', () => {
    const item = {};
    const objWithCycle = {
      item,
      name: 'test',
      remove: 'remove',
    };
    item.parent = objWithCycle;
    const { cloned, excluded } = AttributeReference.cloneExcluding(objWithCycle, ['remove']);
    expect(cloned).toEqual({
      item: {},
      name: 'test',
    });
    expect(excluded).toEqual(['/remove']);
  });

  it('should allow non-circular reference and should treat them independently for filtering', () => {
    const item = { value: 'value' };
    const objWithSharedPeer = {
      item: item,
      second: item,
      third: item,
      fourth: item,
    };
    const { cloned, excluded } = AttributeReference.cloneExcluding(objWithSharedPeer, ['third', '/second/value']);
    expect(cloned).toEqual({
      item: { value: 'value' },
      second: {},
      fourth: { value: 'value' },
    });
    expect(excluded).toEqual(['/second/value', '/third']);
  });

  it('should allow for an empty reference list', () => {
    const { cloned, excluded } = AttributeReference.cloneExcluding(
      {
        launchdarkly: {
          u2c: true,
        },
        ld: false,
        foo: ['bar', 'baz'],
        'a/b': 1,
        'm~n': 2,
        ' ': ' ',
        null: null,
      },
      []
    );
    expect(cloned).toEqual({
      launchdarkly: {
        u2c: true,
      },
      ld: false,
      foo: ['bar', 'baz'],
      'a/b': 1,
      'm~n': 2,
      ' ': ' ',
      null: null,
    });
    expect(excluded).toEqual([]);
  });
});

describe('when given a literal', () => {
  it('can convert it to a reference', () => {
    expect(AttributeReference.literalToReference('/~why')).toEqual('/~1~0why');
  });
});
