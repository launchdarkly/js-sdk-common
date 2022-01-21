const messages = require('./messages');

// The localStorageProvider is provided by the platform object. It should have the following
// methods, each of which should return a Promise:
// - get(key): Gets the string value, if any, for the given key
// - set(key, value): Stores a string value for the given key
// - remove(key): Removes the given key
//
// Storage is just a light wrapper of the localStorageProvider, adding error handling and
// ensuring that we don't call it if it's unavailable. The get method will simply resolve
// with an undefined value if there is an error or if there is no localStorageProvider.
// None of the promises returned by Storage will ever be rejected.
//
// It is always possible that the underlying platform storage mechanism might fail or be
// disabled. If so, it's likely that it will keep failing, so we will only log one warning
// instead of repetitive warnings.
function PersistentStorage(localStorageProvider, logger) {
  const storage = {};
  let loggedError = false;

  const logError = err => {
    if (!loggedError) {
      loggedError = true;
      logger.warn(messages.localStorageUnavailable(err));
    }
  };

  storage.isEnabled = () => !!localStorageProvider;

  // Resolves with a value, or undefined if storage is unavailable. Never rejects.
  storage.get = key =>
    new Promise(resolve => {
      if (!localStorageProvider) {
        resolve(undefined);
        return;
      }
      localStorageProvider
        .get(key)
        .then(resolve)
        .catch(err => {
          logError(err);
          resolve(undefined);
        });
    });

  // Resolves with true if successful, or false if storage is unavailable. Never rejects.
  storage.set = (key, value) =>
    new Promise(resolve => {
      if (!localStorageProvider) {
        resolve(false);
        return;
      }
      localStorageProvider
        .set(key, value)
        .then(() => resolve(true))
        .catch(err => {
          logError(err);
          resolve(false);
        });
    });

  // Resolves with true if successful, or false if storage is unavailable. Never rejects.
  storage.clear = key =>
    new Promise(resolve => {
      if (!localStorageProvider) {
        resolve(false);
        return;
      }
      localStorageProvider
        .clear(key)
        .then(() => resolve(true))
        .catch(err => {
          logError(err);
          resolve(false);
        });
    });

  return storage;
}

module.exports = PersistentStorage;
