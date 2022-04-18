const utils = require('./utils');

function Identity(initialContext, onChange) {
  const ident = {};
  let user;

  ident.setUser = function(u) {
    user = utils.sanitizeContext(u);
    if (user && onChange) {
      onChange(utils.clone(user));
    }
  };

  ident.getContext = function() {
    return user ? utils.clone(user) : null;
  };

  if (initialContext) {
    ident.setUser(initialContext);
  }

  return ident;
}

module.exports = Identity;
