const canonicalize = require('./canonicalize');
const EventSummarizer = require('./EventSummarizer');

/**
 * Construct a multi-event summarizer. This summarizer produces a summary event for each unique context.
 * @param {{filter: (context: any) => any}} contextFilter
 */
function MultiEventSummarizer(contextFilter) {
  let summarizers = {};
  let contexts = {};

  /**
   * Summarize the given event.
   * @param {{
   *   kind: string,
   *   context?: any,
   * }} event
   */
  function summarizeEvent(event) {
    if (event.kind === 'feature') {
      const key = canonicalize(event.context);
      if (!key) {
        return;
      }

      let summarizer = summarizers[key];
      if (!summarizer) {
        summarizers[key] = EventSummarizer();
        summarizer = summarizers[key];
        contexts[key] = event.context;
      }

      summarizer.summarizeEvent(event);
    }
  }

  /**
   * Get the summaries of the events that have been summarized.
   * @returns {any[]}
   */
  function getSummaries() {
    const summarizersToFlush = summarizers;
    const contextsForSummaries = contexts;

    summarizers = {};
    contexts = {};
    return Object.entries(summarizersToFlush).map(([key, summarizer]) => {
      const summary = summarizer.getSummary();
      summary.context = contextFilter.filter(contextsForSummaries[key]);
      return summary;
    });
  }

  return {
    summarizeEvent,
    getSummaries,
  };
}

module.exports = MultiEventSummarizer;
