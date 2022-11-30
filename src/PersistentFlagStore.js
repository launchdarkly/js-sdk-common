const utils = require('./utils');

function PersistentFlagStore(storage, environment, hash, ident) {
  const store = {};

  function getFlagsKey() {
    let key = '';
    const context = ident.getContext();
    if (context) {
      key = hash || utils.btoa(JSON.stringify(context));
    }
    return 'ld:' + environment + ':' + key;
  }

  // Returns a Promise which will be resolved with a parsed JSON value if a stored value was available,
  // or resolved with null if there was no value or if storage was not available.
  store.loadFlags = () =>
    storage.get(getFlagsKey()).then(dataStr => {
      if (dataStr === null || dataStr === undefined) {
        return null;
      }
      try {
        let data = JSON.parse(dataStr);
        if (data) {
          const schema = data.$schema;
          if (schema === undefined || schema < 1) {
            data = utils.transformValuesToVersionedValues(data);
          } else {
            delete data['$schema'];
          }
        }
        return data;
      } catch (ex) {
        return store.clearFlags().then(() => null);
      }
    });

  // Resolves with true if successful, or false if storage is unavailable. Never rejects.
  store.saveFlags = flags => {
    const data = utils.extend({}, flags, { $schema: 1 });
    return storage.set(getFlagsKey(), JSON.stringify(data));
  };

  // Resolves with true if successful, or false if storage is unavailable. Never rejects.
  store.clearFlags = () => storage.clear(getFlagsKey());

  return store;
}

module.exports = PersistentFlagStore;
