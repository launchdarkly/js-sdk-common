import uuidv1 from 'uuid/v1';

import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

// Transforms the user object if necessary to make sure it has a valid key.
// 1. If a key is present, but is not a string, change it to a string.
// 2. If no key is present, and "anonymous" is true, use a UUID as a key. This is cached in local
// storage if possible.
// 3. If there is no key (or no user object), return an error.

const ldUserIdKey = 'ld:$anonUserId';

export default function UserValidator(persistentStorage) {
  function getCachedUserId() {
    return persistentStorage.get(ldUserIdKey);
  }

  function setCachedUserId(id) {
    return persistentStorage.set(ldUserIdKey, id);
  }

  const ret = {};

  // Validates the user, returning a Promise that resolves to the validated user, or rejects if there is an error.
  ret.validateUser = user => {
    if (!user) {
      return Promise.reject(new errors.LDInvalidUserError(messages.userNotSpecified()));
    }

    const userOut = utils.clone(user);
    if (userOut.key !== null && userOut.key !== undefined) {
      userOut.key = userOut.key.toString();
      return Promise.resolve(userOut);
    }
    if (userOut.anonymous) {
      return getCachedUserId().then(cachedId => {
        if (cachedId) {
          userOut.key = cachedId;
          return userOut;
        } else {
          const id = uuidv1();
          userOut.key = id;
          return setCachedUserId(id).then(() => userOut);
        }
      });
    } else {
      return Promise.reject(new errors.LDInvalidUserError(messages.invalidUser()));
    }
  };

  return ret;
}
