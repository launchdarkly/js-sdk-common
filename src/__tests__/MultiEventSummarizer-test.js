const MultiEventSummarizer = require('../MultiEventSummarizer');
const ContextFilter = require('../ContextFilter');

function makeEvent(key, version, variation, value, defaultVal, context) {
  return {
    kind: 'feature',
    creationDate: 1000,
    key: key,
    version: version,
    context: context,
    variation: variation,
    value: value,
    default: defaultVal,
  };
}

describe('given a multi-event summarizer and context filter', () => {
  let summarizer;
  let contextFilter;

  beforeEach(() => {
    contextFilter = ContextFilter(false, []);
    summarizer = MultiEventSummarizer(contextFilter);
  });

  it('creates new summarizer for new context hash', async () => {
    const context = { kind: 'user', key: 'user1' };
    const event = { kind: 'feature', context };

    summarizer.summarizeEvent(event);

    const summaries = await summarizer.getSummaries();
    expect(summaries).toHaveLength(1);
  });

  it('uses existing summarizer for same context hash', async () => {
    const context = { kind: 'user', key: 'user1' };
    const event1 = { kind: 'feature', context, value: 'value1' };
    const event2 = { kind: 'feature', context, value: 'value2' };

    summarizer.summarizeEvent(event1);
    summarizer.summarizeEvent(event2);

    const summaries = await summarizer.getSummaries();
    expect(summaries).toHaveLength(1);
  });

  it('ignores non-feature events', async () => {
    const context = { kind: 'user', key: 'user1' };
    const event = { kind: 'identify', context };

    summarizer.summarizeEvent(event);

    const summaries = await summarizer.getSummaries();
    expect(summaries).toHaveLength(0);
  });

  it('handles multiple different contexts', async () => {
    const context1 = { kind: 'user', key: 'user1' };
    const context2 = { kind: 'user', key: 'user2' };
    const event1 = { kind: 'feature', context: context1 };
    const event2 = { kind: 'feature', context: context2 };

    summarizer.summarizeEvent(event1);
    summarizer.summarizeEvent(event2);

    const summaries = await summarizer.getSummaries();
    expect(summaries).toHaveLength(2);
  });

  it('automatically clears summaries when summarized', async () => {
    const context = { kind: 'user', key: 'user1' };
    const event = { kind: 'feature', context };

    summarizer.summarizeEvent(event);

    const summariesA = await summarizer.getSummaries();
    const summariesB = await summarizer.getSummaries();
    expect(summariesA).toHaveLength(1);
    expect(summariesB).toHaveLength(0);
  });

  it('increments counters for feature events across multiple contexts', async () => {
    const context1 = { kind: 'user', key: 'user1' };
    const context2 = { kind: 'user', key: 'user2' };

    // Events for context1 (using values 100-199)
    const event1 = makeEvent('key1', 11, 1, 100, 111, context1);
    const event2 = makeEvent('key1', 11, 2, 150, 111, context1);
    const event3 = makeEvent('key2', 22, 1, 199, 222, context1);

    // Events for context2 (using values 200-299)
    const event4 = makeEvent('key1', 11, 1, 200, 211, context2);
    const event5 = makeEvent('key1', 11, 2, 250, 211, context2);
    const event6 = makeEvent('key2', 22, 1, 299, 222, context2);

    summarizer.summarizeEvent(event1);
    summarizer.summarizeEvent(event2);
    summarizer.summarizeEvent(event3);
    summarizer.summarizeEvent(event4);
    summarizer.summarizeEvent(event5);
    summarizer.summarizeEvent(event6);

    const summaries = await summarizer.getSummaries();
    expect(summaries).toHaveLength(2);

    // Sort summaries by context key to make assertions consistent
    summaries.sort((a, b) => a.context.key.localeCompare(b.context.key));

    // Verify first context's summary (user1, values 100-199)
    const summary1 = summaries[0];
    summary1.features.key1.counters.sort((a, b) => a.value - b.value);
    expect(summary1.features).toEqual({
      key1: {
        contextKinds: ['user'],
        default: 111,
        counters: [
          { value: 100, variation: 1, version: 11, count: 1 },
          { value: 150, variation: 2, version: 11, count: 1 },
        ],
      },
      key2: {
        contextKinds: ['user'],
        default: 222,
        counters: [{ value: 199, variation: 1, version: 22, count: 1 }],
      },
    });

    // Verify second context's summary (user2, values 200-299)
    const summary2 = summaries[1];
    summary2.features.key1.counters.sort((a, b) => a.value - b.value);
    expect(summary2.features).toEqual({
      key1: {
        contextKinds: ['user'],
        default: 211,
        counters: [
          { value: 200, variation: 1, version: 11, count: 1 },
          { value: 250, variation: 2, version: 11, count: 1 },
        ],
      },
      key2: {
        contextKinds: ['user'],
        default: 222,
        counters: [{ value: 299, variation: 1, version: 22, count: 1 }],
      },
    });
  });
});
