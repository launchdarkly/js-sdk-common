import * as errors from './errors';
import * as utils from './utils';

const MAX_URL_LENGTH = 2000;

export default function EventSender(platform, environmentId, imageCreator, options) {
  const imageUrlPath = '/a/' + environmentId + '.gif';
  const headers = utils.extend(
    {
      'Content-Type': 'application/json',
      'X-LaunchDarkly-Event-Schema': '3',
    },
    utils.getLDHeaders(platform, options)
  );
  const sender = {};

  function loadUrlUsingImage(src) {
    const img = new window.Image();
    img.src = src;
  }

  function getResponseInfo(result) {
    const ret = { status: result.status };
    const dateStr = result.header('date');
    if (dateStr) {
      const time = Date.parse(dateStr);
      if (time) {
        ret.serverTime = time;
      }
    }
    return ret;
  }

  sender.sendChunk = (events, url, usePost) => {
    const createImage = imageCreator || loadUrlUsingImage;
    const jsonBody = JSON.stringify(events);

    function doPostRequest(canRetry) {
      return platform
        .httpRequest('POST', url, headers, jsonBody)
        .promise.then(result => {
          if (!result) {
            // This was a response from a fire-and-forget request, so we won't have a status.
            return;
          }
          if (result.status >= 400 && errors.isHttpErrorRecoverable(result.status) && canRetry) {
            return doPostRequest(false);
          } else {
            return getResponseInfo(result);
          }
        })
        .catch(() => {
          if (canRetry) {
            return doPostRequest(false);
          }
          return Promise.reject();
        });
    }

    if (usePost) {
      return doPostRequest(true).catch(() => {});
    } else {
      const src = url + imageUrlPath + '?d=' + utils.base64URLEncode(jsonBody);
      createImage(src);
      return Promise.resolve();
      // We do not specify an onload handler for the image because we don't want the client to wait around
      // for the image to load - it won't provide a server response, there's nothing to be done.
    }
  };

  sender.sendEvents = function(events, url) {
    if (!platform.httpRequest) {
      return Promise.resolve();
    }
    const canPost = platform.httpAllowsPost();
    let chunks;
    if (canPost) {
      // no need to break up events into chunks if we can send a POST
      chunks = [events];
    } else {
      chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - url.length, events);
    }
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sender.sendChunk(chunks[i], url, canPost));
    }
    return Promise.all(results);
  };

  return sender;
}
