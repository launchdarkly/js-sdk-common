import { appendUrlPath, getLDUserAgentString, wrapPromiseCallback, once } from '../utils';

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

  it('when using once the original function is only called once', () => {
    let count = 0;
    const fn = once(() => {
      count++;
      return count;
    });

    expect(fn()).toBe(1);
    expect(fn()).toBe(1);
    expect(fn()).toBe(1);
    expect(count).toBe(1);
  });

  it('once works with async functions', async () => {
    let count = 0;
    const fn = once(async () => {
      count++;
      return count;
    });

    const result1 = await fn();
    const result2 = await fn();
    const result3 = await fn();

    expect(result1).toBe(1);
    expect(result2).toBe(1);
    expect(result3).toBe(1);
    expect(count).toBe(1);
  });
});
