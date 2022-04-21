import { getLDHeaders, transformHeaders } from '../headers';
import { getLDUserAgentString } from '../utils';
import * as stubPlatform from './stubPlatform';

describe('getLDHeaders', () => {
  it('sends no headers unless sendLDHeaders is true', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, {});
    expect(headers).toEqual({});
  });

  it('adds user-agent header', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, { sendLDHeaders: true });
    expect(headers).toMatchObject({ 'User-Agent': getLDUserAgentString(platform) });
  });

  it('adds user-agent header with custom name', () => {
    const platform = stubPlatform.defaults();
    platform.userAgentHeaderName = 'X-Fake-User-Agent';
    const headers = getLDHeaders(platform, { sendLDHeaders: true });
    expect(headers).toMatchObject({ 'X-Fake-User-Agent': getLDUserAgentString(platform) });
  });

  it('adds wrapper info if specified, without version', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, { sendLDHeaders: true, wrapperName: 'FakeSDK' });
    expect(headers).toMatchObject({
      'User-Agent': getLDUserAgentString(platform),
      'X-LaunchDarkly-Wrapper': 'FakeSDK',
    });
  });

  it('adds wrapper info if specified, with version', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, { sendLDHeaders: true, wrapperName: 'FakeSDK', wrapperVersion: '9.9' });
    expect(headers).toMatchObject({
      'User-Agent': getLDUserAgentString(platform),
      'X-LaunchDarkly-Wrapper': 'FakeSDK/9.9',
    });
  });

  it('sets the X-LaunchDarkly-Tags header with valid id and version.', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, {
      sendLDHeaders: true,
      application: {
        id: 'test-application',
        version: 'test-version',
      },
    });
    expect(headers).toMatchObject({
      'User-Agent': getLDUserAgentString(platform),
      'x-launchdarkly-tags': 'application-id/test-application application-version/test-version',
    });
  });

  it('sets the X-LaunchDarkly-Tags header with just application id', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, {
      sendLDHeaders: true,
      application: {
        id: 'test-application',
      },
    });
    expect(headers).toMatchObject({
      'User-Agent': getLDUserAgentString(platform),
      'x-launchdarkly-tags': 'application-id/test-application',
    });
  });

  it('sets the X-LaunchDarkly-Tags header with just application version.', () => {
    const platform = stubPlatform.defaults();
    const headers = getLDHeaders(platform, {
      sendLDHeaders: true,
      application: {
        version: 'test-version',
      },
    });
    expect(headers).toMatchObject({
      'User-Agent': getLDUserAgentString(platform),
      'x-launchdarkly-tags': 'application-version/test-version',
    });
  });
});

describe('transformHeaders', () => {
  it('does not modify the headers if the option is not available', () => {
    const inputHeaders = { a: '1', b: '2' };
    const headers = transformHeaders(inputHeaders, {});
    expect(headers).toEqual(inputHeaders);
  });

  it('modifies the headers if the option has a transform', () => {
    const inputHeaders = { c: '3', d: '4' };
    const outputHeaders = { c: '9', d: '4', e: '5' };
    const headerTransform = input => {
      const output = { ...input };
      output['c'] = '9';
      output['e'] = '5';
      return output;
    };
    const headers = transformHeaders(inputHeaders, { requestHeaderTransform: headerTransform });
    expect(headers).toEqual(outputHeaders);
  });

  it('cannot mutate the input header object', () => {
    const inputHeaders = { f: '6' };
    const expectedInputHeaders = { f: '6' };
    const headerMutate = input => {
      input['f'] = '7'; // eslint-disable-line no-param-reassign
      return input;
    };
    transformHeaders(inputHeaders, { requestHeaderTransform: headerMutate });
    expect(inputHeaders).toEqual(expectedInputHeaders);
  });
});
