const utils = require('./utils');

function Identity(initialContext, onChange) {
  const ident = {};
  let context;

  ident.setContext = function(c) {
    context = utils.sanitizeContext(c);
    if (context && onChange) {
      onChange(utils.clone(context));
    }
  };

  ident.getContext = function() {
    return context ? utils.clone(context) : null;
  };

  if (initialContext) {
    ident.setContext(initialContext);
  }

  return ident;
}

module.exports = Identity;
