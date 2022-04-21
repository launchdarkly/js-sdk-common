import { getLDUserAgentString } from './utils';
import { getTags } from './configuration';

export function getLDHeaders(platform, options) {
  if (options && !options.sendLDHeaders) {
    return {};
  }
  const h = {
    'X-LaunchDarkly-User-Agent': getLDUserAgentString(platform),
  };
  if (options && options.wrapperName) {
    h['X-LaunchDarkly-Wrapper'] = options.wrapperVersion
      ? options.wrapperName + '/' + options.wrapperVersion
      : options.wrapperName;
  }
  const tags = getTags(options);
  const tagKeys = Object.keys(tags);
  if (tagKeys.length) {
    h['x-launchdarkly-tags'] = tagKeys
      .sort()
      .flatMap(
        key => (Array.isArray(tags[key]) ? tags[key].sort().map(value => `${key}/${value}`) : [`${key}/${tags[key]}`])
      )
      .join(' ');
  }
  return h;
}

export function transformHeaders(headers, options) {
  if (!options || !options.requestHeaderTransform) {
    return headers;
  }
  return options.requestHeaderTransform({ ...headers });
}
