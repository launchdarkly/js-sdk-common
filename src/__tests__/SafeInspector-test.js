const SafeInspector = require('../SafeInspector');
const stubPlatform = require('./stubPlatform');

describe('given a safe inspector', () => {
  const platform = stubPlatform.defaults();
  const mockInspector = {
    type: 'the-inspector-type',
    name: 'the-inspector-name',
    method: () => {
      throw new Error('evil inspector');
    },
  };
  const safeInspector = SafeInspector(mockInspector, platform.testing.logger);

  it('has the correct type', () => {
    expect(safeInspector.type).toEqual('the-inspector-type');
  });

  it('does not allow exceptions to propagate', () => {
    safeInspector.method();
  });

  it('only logs one error', () => {
    safeInspector.method();
    safeInspector.method();
    expect(platform.testing.logger.output.warn).toEqual([
      'an inspector: "the-inspector-name" of type: "the-inspector-type" generated an exception',
    ]);
  });
});

// Type and name are required by the schema, but it should operate fine if they are not specified.
describe('given a safe inspector with no name or type', () => {
  const platform = stubPlatform.defaults();
  const mockInspector = {
    method: () => {
      throw new Error('evil inspector');
    },
  };
  const safeInspector = SafeInspector(mockInspector, platform.testing.logger);

  it('has undefined type', () => {
    expect(safeInspector.type).toBeUndefined();
  });

  it('has undefined name', () => {
    expect(safeInspector.name).toBeUndefined();
  });

  it('does not allow exceptions to propagate', () => {
    safeInspector.method();
  });

  it('only logs one error', () => {
    safeInspector.method();
    safeInspector.method();
    expect(platform.testing.logger.output.warn).toEqual([
      'an inspector: "undefined" of type: "undefined" generated an exception',
    ]);
  });
});
