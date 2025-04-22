import { hashContext } from './context';
import EventSummarizer from './EventSummarizer';
/**
 * 
 * @param {{filter: (context: any) => any}} contextFilter 
 * @param {() => {update: (value: string) => void, digest: (format: string) => Promise<string>}} hasherFactory 
 */
function MultiEventSummarizer(contextFilter, hasherFactory) {
    let summarizers = {};
    let contexts = {};
    const pendingPromises = [];

    /**
     * Summarize the given event.
     * @param {{
     *   kind: string,
     *   context?: any,
     * }} event 
     */
    function summarizeEvent(event) {
        // This will execute asynchronously, which means that a flush could happen before the event
        // is summarized. When that happens, then the event will just be in the next batch of summaries.
        const promise = (async () => {
            if(event.kind === 'feature') {
                const hash = await hashContext(event.context, hasherFactory());
                if(!hash) {
                    return;
                }

                let summarizer = summarizers[hash];
                if(!summarizer) {
                    summarizers[hash] = EventSummarizer();
                    summarizer = summarizers[hash];
                    contexts[hash] = event.context;
                }
                
                summarizer.summarizeEvent(event);
            }
        })();
        pendingPromises.push(promise);
        promise.finally(() => {
            const index = pendingPromises.indexOf(promise);
            if(index !== -1) {
                pendingPromises.splice(index, 1);
            }
        });
    }

    /**
     * Get the summaries of the events that have been summarized.
     * @returns {any[]}
     */
    async function getSummaries() {
        // Wait for any pending summarizations to complete
        // Additional tasks queued while waiting will not be waited for.
        await Promise.all([...pendingPromises]);

        const summarizersToFlush = summarizers;
        const contextsForSummaries = contexts;

        summarizers = {};
        contexts = {};
        return Object.entries(summarizersToFlush).map(([hash, summarizer]) => {
            const summary = summarizer.getSummary();
            summary.context = contextFilter.filter(contextsForSummaries[hash]);
            return summary;
        }); 
    }

    return {
        summarizeEvent,
        getSummaries
    };
}

module.exports = MultiEventSummarizer;