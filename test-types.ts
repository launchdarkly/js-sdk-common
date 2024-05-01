
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file.

import * as ld from 'launchdarkly-js-sdk-common';

var userWithKeyOnly: ld.LDUser = { key: 'user' };
var anonUserWithNoKey: ld.LDUser = { anonymous: true };
var anonUserWithKey: ld.LDUser = { key: 'anon-user', anonymous: true };
var user: ld.LDContext = {
  key: 'user',
  name: 'name',
  firstName: 'first',
  lastName: 'last',
  email: 'test@example.com',
  avatar: 'http://avatar.url',
  ip: '1.1.1.1',
  country: 'us',
  anonymous: true,
  custom: {
    'a': 's',
    'b': true,
    'c': 3,
    'd': [ 'x', 'y' ],
    'e': [ true, false ],
    'f': [ 1, 2 ]
  },
  privateAttributeNames: [ 'name', 'email' ]
};
var logger: ld.LDLogger = ld.commonBasicLogger({ level: 'info' });
var allBaseOptions: ld.LDOptionsBase = {
  bootstrap: { },
  baseUrl: '',
  eventsUrl: '',
  streamUrl: '',
  streaming: true,
  useReport: true,
  sendLDHeaders: true,
  requestHeaderTransform: (x) => x,
  evaluationReasons: true,
  sendEvents: true,
  allAttributesPrivate: true,
  privateAttributes: [ 'x' ],
  sendEventsOnlyForVariation: true,
  flushInterval: 1,
  streamReconnectDelay: 1,
  logger: logger,
  application: {
    version: 'version',
    id: 'id'
  }
};

var client: ld.LDClientBase = {} as ld.LDClientBase;  // wouldn't do this in real life, it's just so the following statements will compile

client.waitUntilReady().then(() => {});
client.waitForInitialization(5).then(() => {});

client.identify(user).then(() => {});
client.identify(user, undefined, () => {});
client.identify(user, 'hash').then(() => {});

var user: ld.LDContext = client.getContext();

client.flush(() => {});
client.flush().then(() => {});

var boolFlagValue: ld.LDFlagValue = client.variation('key', false);
var numberFlagValue: ld.LDFlagValue = client.variation('key', 2);
var stringFlagValue: ld.LDFlagValue = client.variation('key', 'default');
var jsonFlagValue: ld.LDFlagValue = client.variation('key', [ 'a', 'b' ]);

var detail: ld.LDEvaluationDetail = client.variationDetail('key', 'default');
var detailValue: ld.LDFlagValue = detail.value;
var detailIndex: number | undefined = detail.variationIndex;
var detailReason: ld.LDEvaluationReason | undefined = detail.reason;

client.setStreaming(true);
client.setStreaming();

function handleEvent() {}
client.on('event', handleEvent);
client.off('event', handleEvent);

client.track('event');
client.track('event', { someData: 'x' });
client.track('event', null, 3.5);

var flagSet: ld.LDFlagSet = client.allFlags();
var flagSetValue: ld.LDFlagValue = flagSet['key'];

client.close(() => {});
client.close().then(() => {});

var contextKeys = ld.getContextKeys(user);
