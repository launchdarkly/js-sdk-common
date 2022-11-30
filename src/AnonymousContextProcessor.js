const { v1: uuidv1 } = require('uuid');
const { getContextKinds } = require('./context');

const errors = require('./errors');
const messages = require('./messages');
const utils = require('./utils');

const ldUserIdKey = 'ld:$anonUserId';

/**
 * Create an object which can process a context and populate any required keys
 * for anonymous objects.
 *
 * @param {Object} persistentStorage The persistent storage from which to store
 * and access persisted anonymous context keys.
 * @returns An AnonymousContextProcessor.
 */
function AnonymousContextProcessor(persistentStorage) {
  function getContextKeyIdString(kind) {
    if (kind === undefined || kind === null || kind === 'user') {
      return ldUserIdKey;
    }
    return `ld:$contextKey:${kind}`;
  }

  function getCachedContextKey(kind) {
    return persistentStorage.get(getContextKeyIdString(kind));
  }

  function setCachedContextKey(id, kind) {
    return persistentStorage.set(getContextKeyIdString(kind), id);
  }

  /**
   * Process a single kind context, or a single context within a multi-kind context.
   * @param {string} kind The kind of the context. Independent because the kind is not prevent
   * within a context in a multi-kind context.
   * @param {Object} context
   * @returns {Promise} a promise that resolves to a processed contexts, or rejects
   * a context which cannot be processed.
   */
  function processSingleKindContext(kind, context) {
    // We are working on a copy of an original context, so we want to re-assign
    // versus duplicating it again.

    /* eslint-disable no-param-reassign */
    if (context.key !== null && context.key !== undefined) {
      context.key = context.key.toString();
      return Promise.resolve(context);
    }

    if (context.anonymous) {
      // If the key doesn't exist, then the persistent storage will resolve
      // with undefined.
      return getCachedContextKey(kind).then(cachedId => {
        if (cachedId) {
          context.key = cachedId;
          return context;
        } else {
          const id = uuidv1();
          context.key = id;
          return setCachedContextKey(id, kind).then(() => context);
        }
      });
    } else {
      return Promise.reject(new errors.LDInvalidUserError(messages.invalidContext()));
    }
    /* eslint-enable no-param-reassign */
  }

  /**
   * Process the context, returning a Promise that resolves to the processed context, or rejects if there is an error.
   * @param {Object} context
   * @returns {Promise} A promise which resolves to a processed context, or a rejection if the context cannot be
   * processed. The context should still be checked for overall validity after being processed.
   */
  this.processContext = context => {
    if (!context) {
      return Promise.reject(new errors.LDInvalidUserError(messages.contextNotSpecified()));
    }

    const processedContext = utils.clone(context);

    if (context.kind === 'multi') {
      const kinds = getContextKinds(processedContext);

      return Promise.all(kinds.map(kind => processSingleKindContext(kind, processedContext[kind]))).then(
        () => processedContext
      );
    }
    return processSingleKindContext(context.kind, processedContext);
  };
}

module.exports = AnonymousContextProcessor;
