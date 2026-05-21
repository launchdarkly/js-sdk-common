/* global crypto */
// The implementation in this file generates UUIDs in v4 format and is suitable
// for use as a UUID in LaunchDarkly events. It is not a rigorous implementation.
//
// Adapted from:
// https://github.com/launchdarkly/js-core/blob/main/packages/sdk/browser/src/platform/randomUuidV4.ts

// It uses crypto.randomUUID when available.
// If crypto.randomUUID is not available, then it uses random values and forms
// the UUID itself.
// When possible it uses crypto.getRandomValues, but it can use Math.random
// if crypto.getRandomValues is not available.

// UUIDv4 Struct definition.
// https://www.rfc-archive.org/getrfc.php?rfc=4122
// Appendix A.  Appendix A - Sample Implementation
const timeLow = { start: 0, end: 3 };
const timeMid = { start: 4, end: 5 };
const timeHiAndVersion = { start: 6, end: 7 };
const clockSeqHiAndReserved = { start: 8, end: 8 };
const clockSeqLow = { start: 9, end: 9 };
const nodes = { start: 10, end: 15 };

function getRandom128bit() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const typedArray = new Uint8Array(16);
    crypto.getRandomValues(typedArray);
    return [...typedArray.values()];
  }
  const values = [];
  for (let index = 0; index < 16; index += 1) {
    values.push(Math.floor(Math.random() * 256));
  }
  return values;
}

function hex(bytes, range) {
  let strVal = '';
  for (let index = range.start; index <= range.end; index += 1) {
    strVal += bytes[index].toString(16).padStart(2, '0');
  }
  return strVal;
}

function formatDataAsUuidV4(bytes) {
  // eslint-disable-next-line no-bitwise, no-param-reassign
  bytes[clockSeqHiAndReserved.start] = (bytes[clockSeqHiAndReserved.start] | 0x80) & 0xbf;
  // eslint-disable-next-line no-bitwise, no-param-reassign
  bytes[timeHiAndVersion.start] = (bytes[timeHiAndVersion.start] & 0x0f) | 0x40;

  return (
    `${hex(bytes, timeLow)}-${hex(bytes, timeMid)}-${hex(bytes, timeHiAndVersion)}-` +
    `${hex(bytes, clockSeqHiAndReserved)}${hex(bytes, clockSeqLow)}-${hex(bytes, nodes)}`
  );
}

function fallbackUuidV4() {
  const bytes = getRandom128bit();
  return formatDataAsUuidV4(bytes);
}

function randomUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return fallbackUuidV4();
}

module.exports = { randomUuidV4, fallbackUuidV4, formatDataAsUuidV4 };
