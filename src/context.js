const { commonBasicLogger } = require('./loggers');
const canonicalize = require('./canonicalize');

/**
 * Validate a context kind.
 * @param {string} kind
 * @returns true if the kind is valid.
 */
function validKind(kind) {
  return typeof kind === 'string' && kind !== 'kind' && kind.match(/^(\w|\.|-)+$/);
}

/**
 * Perform a check of basic context requirements.
 * @param {Object} context
 * @param {boolean} allowLegacyKey If true, then a legacy user can have an
 * empty or non-string key. A legacy user is a context without a kind.
 * @returns true if the context meets basic requirements.
 */
function checkContext(context, allowLegacyKey) {
  if (context) {
    if (allowLegacyKey && (context.kind === undefined || context.kind === null)) {
      return context.key !== undefined && context.key !== null;
    }
    const key = context.key;
    const kind = context.kind === undefined ? 'user' : context.kind;
    const kindValid = validKind(kind);
    const keyValid = kind === 'multi' || (key !== undefined && key !== null && key !== '');
    if (kind === 'multi') {
      const kinds = Object.keys(context).filter(key => key !== 'kind');
      return (
        keyValid &&
        kinds.every(key => validKind(key)) &&
        kinds.every(key => {
          const contextKey = context[key].key;
          return contextKey !== undefined && contextKey !== null && contextKey !== '';
        })
      );
    }
    return keyValid && kindValid;
  }
  return false;
}

/**
 * For a given context get a list of context kinds.
 * @param {Object} context
 * @returns {string[]} A list of kinds in the context.
 */
function getContextKinds(context) {
  if (context) {
    if (context.kind === null || context.kind === undefined) {
      return ['user'];
    }
    if (context.kind !== 'multi') {
      return [context.kind];
    }
    return Object.keys(context).filter(kind => kind !== 'kind');
  }
  return [];
}

/**
 * The partial URL encoding is needed because : is a valid character in context keys.
 *
 * Partial encoding is the replacement of all colon (:) characters with the URL
 * encoded equivalent (%3A) and all percent (%) characters with the URL encoded
 * equivalent (%25).
 * @param {string} key The key to encode.
 * @returns {string} Partially URL encoded key.
 */
function encodeKey(key) {
  if (key.includes('%') || key.includes(':')) {
    return key.replace(/%/g, '%25').replace(/:/g, '%3A');
  }
  return key;
}

function getCanonicalKey(context) {
  if (context) {
    if ((context.kind === undefined || context.kind === null || context.kind === 'user') && context.key) {
      return context.key;
    } else if (context.kind !== 'multi' && context.key) {
      return `${context.kind}:${encodeKey(context.key)}`;
    } else if (context.kind === 'multi') {
      return Object.keys(context)
        .sort()
        .filter(key => key !== 'kind')
        .map(key => `${key}:${encodeKey(context[key].key)}`)
        .join(':');
    }
  }
}

function getContextKeys(context, logger = commonBasicLogger()) {
  if (!context) {
    return undefined;
  }

  const keys = {};
  const { kind, key } = context;

  switch (kind) {
    case undefined:
      keys.user = `${key}`;
      break;
    case 'multi':
      Object.entries(context)
        .filter(([key]) => key !== 'kind')
        .forEach(([key, value]) => {
          if (value && value.key) {
            keys[key] = value.key;
          }
        });
      break;
    case null:
      logger.warn(`null is not a valid context kind: ${context}`);
      break;
    case '':
      logger.warn(`'' is not a valid context kind: ${context}`);
      break;
    default:
      keys[kind] = `${key}`;
      break;
  }

  return keys;
}

function getContextForKind(context, inKind) {
  const kind = inKind || 'user';
  if (context.kind === 'multi') {
    return context[kind];
  } else if (context.kind === kind || (context.kind === undefined && kind === 'user')) {
    return context;
  }
  return undefined;
}

/**
 * Hash the given context using the provided hasher.
 * This implementation can produce different hashes for equivalent contexts. 
 * 
 * For example:
 * A legacy user and a single-kind context of user kind that are equivalent, will hash differently.
 * A multi-context with one kind, and the single context with that kind are equivalent, but will hash differently.
 * Two equivalent contexts, with private attributes that are defined in different orders, will hash differently.
 * 
 * @param {Object} context 
 * @param {{update: (value: string) => void, digest: (format: string) => Promise<string>}} hasher 
 * @returns {Promise<string | undefined>} The hash of the context, or undefined if the context is invalid.
 */
function hashContext(context, hasher) {
  // In js-core we have legacy and non-legacy contexts hash the same. This implementation does not support that.
  // Because this implementation directly uses the user-provided context and doesn't manipulate it.
  // The js-core implementation is more conceptually correct, but it isn't a practical requirement.

  // This implementation additionally doesn't produce the same hash for an equivalent multi-context with one kind, and
  // the single context with that kind.
  if(!checkContext(context)) {
    return undefined;
  }

  try {
    const canonicalized = canonicalize(context);

    hasher.update(canonicalized);

    return hasher.digest('hex');

  } catch(e) {}
}

module.exports = {
  checkContext,
  getContextKeys,
  getContextKinds,
  getCanonicalKey,
  hashContext,
};
