import {
  appendUrlPath,
  base64URLEncode,
  chunkEventsForUrl,
  getContextKeys,
  getLDUserAgentString,
  wrapPromiseCallback,
} from '../utils';

import * as stubPlatform from './stubPlatform';

describe('utils', () => {
  it('appendUrlPath', () => {
    expect(appendUrlPath('http://base', '/path')).toEqual('http://base/path');
    expect(appendUrlPath('http://base', 'path')).toEqual('http://base/path');
    expect(appendUrlPath('http://base/', '/path')).toEqual('http://base/path');
    expect(appendUrlPath('http://base/', '/path')).toEqual('http://base/path');
  });

  describe('wrapPromiseCallback', () => {
    it('should resolve to the value', done => {
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'));
      promise.then(value => {
        expect(value).toEqual('woohoo');
        done();
      });
    });

    it('should reject with the error', done => {
      const error = new Error('something went wrong');
      const promise = wrapPromiseCallback(Promise.reject(error));
      promise.catch(error => {
        expect(error).toEqual(error);
        done();
      });
    });

    it('should call the callback with a value if the promise resolves', done => {
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'), (error, value) => {
        expect(promise).toBeUndefined();
        expect(error).toBeNull();
        expect(value).toEqual('woohoo');
        done();
      });
    });

    it('should call the callback with an error if the promise rejects', done => {
      const actualError = new Error('something went wrong');
      const promise = wrapPromiseCallback(Promise.reject(actualError), (error, value) => {
        expect(promise).toBeUndefined();
        expect(error).toEqual(actualError);
        expect(value).toBeNull();
        done();
      });
    });
  });

  describe('getLDUserAgentString', () => {
    it('uses platform user-agent and unknown version by default', () => {
      const platform = stubPlatform.defaults();
      platform.version = undefined;
      const ua = getLDUserAgentString(platform);
      expect(ua).toEqual('stubClient/?');
    });

    it('uses platform user-agent and platform version if provided', () => {
      const platform = stubPlatform.defaults();
      platform.version = '7.8.9';
      const ua = getLDUserAgentString(platform);
      expect(ua).toEqual('stubClient/7.8.9');
    });
  });

  describe('chunkEventsForUrl', () => {
    it('should properly chunk the list of events', () => {
      const user = { key: 'foo' };
      const event = { kind: 'identify', key: user.key };
      const eventLength = base64URLEncode(JSON.stringify(event)).length;
      const events = [event, event, event, event, event];
      const chunks = chunkEventsForUrl(eventLength * 2, events);
      expect(chunks).toEqual([[event, event], [event, event], [event]]);
    });
  });

  describe('getContextKeys', () => {
    it('returns undefined if argument is undefined', () => {
      const context = undefined;
      const keys = getContextKeys(context);
      expect(keys).toBeUndefined();
    });

    it('works with legacy user without kind attribute', () => {
      const user = {
        key: 'legacy-user-key',
        name: 'Test User',
        custom: {
          customAttribute1: true,
        },
      };
      const keys = getContextKeys(user);
      expect(keys).toEqual({ user: 'legacy-user-key' });
    });

    it('gets keys from multi context', () => {
      const context = {
        kind: 'multi',
        user: {
          key: 'test-user-key',
          name: 'Test User',
          isPremiumCustomer: true,
        },
        organization: {
          key: 'test-organization-key',
          name: 'Test Company',
          industry: 'technology',
        },
      };
      const keys = getContextKeys(context);
      expect(keys).toEqual({ user: 'test-user-key', organization: 'test-organization-key' });
    });

    it('ignores undefined keys from multi context', () => {
      const context = {
        kind: 'multi',
        user: {
          key: 'test-user-key',
          name: 'Test User',
          isPremiumCustomer: true,
        },
        organization: {
          name: 'Test Company',
          industry: 'technology',
        },
        rogueAttribute: undefined,
      };
      const keys = getContextKeys(context);
      expect(keys).toEqual({ user: 'test-user-key' });
    });

    it('gets keys from single context', () => {
      const context = {
        key: 'test-drone-key',
        kind: 'drone',
        name: 'test-drone',
      };
      const keys = getContextKeys(context);
      expect(keys).toEqual({ drone: 'test-drone-key' });
    });
  });
});
