function createCustomError(name) {
  function CustomError(message, code) {
    Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
    this.message = message;
    this.code = code;
  }

  CustomError.prototype = new Error();
  CustomError.prototype.name = name;
  CustomError.prototype.constructor = CustomError;

  return CustomError;
}

const LDUnexpectedResponseError = createCustomError('LaunchDarklyUnexpectedResponseError');
const LDInvalidEnvironmentIdError = createCustomError('LaunchDarklyInvalidEnvironmentIdError');
const LDInvalidUserError = createCustomError('LaunchDarklyInvalidUserError');
const LDInvalidEventKeyError = createCustomError('LaunchDarklyInvalidEventKeyError');
const LDInvalidArgumentError = createCustomError('LaunchDarklyInvalidArgumentError');
const LDFlagFetchError = createCustomError('LaunchDarklyFlagFetchError');
const LDInvalidDataError = createCustomError('LaunchDarklyInvalidDataError');
const LDTimeoutError = createCustomError('LaunchDarklyTimeoutError');

function isHttpErrorRecoverable(status) {
  if (status >= 400 && status < 500) {
    return status === 400 || status === 408 || status === 429;
  }
  return true;
}

module.exports = {
  LDUnexpectedResponseError,
  LDInvalidEnvironmentIdError,
  LDInvalidUserError,
  LDInvalidEventKeyError,
  LDInvalidArgumentError,
  LDInvalidDataError,
  LDFlagFetchError,
  LDTimeoutError,
  isHttpErrorRecoverable,
};
