const utils = require('./utils');

function Identity(initialUser, onChange) {
  const ident = {};
  let user;

  ident.setUser = function(u) {
    const previousUser = user && utils.clone(user);
    user = utils.sanitizeUser(u);
    if (user && onChange) {
      onChange(utils.clone(user), previousUser);
    }
  };

  ident.getUser = function() {
    return user ? utils.clone(user) : null;
  };

  if (initialUser) {
    ident.setUser(initialUser);
  }

  return ident;
}

module.exports = Identity;
