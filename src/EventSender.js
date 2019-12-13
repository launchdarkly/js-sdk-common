import * as errors from './errors';
import * as utils from './utils';

const MAX_URL_LENGTH = 2000;

export default function EventSender(platform, eventsUrl, environmentId, options) {
  const postUrl = eventsUrl + '/events/bulk/' + environmentId;
  const imageUrl = eventsUrl + '/a/' + environmentId + '.gif';
  const httpFallbackPing = platform.httpFallbackPing; // this will be set for us if we're in the browser SDK
  const sender = {};

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

  function sendChunk(events, usePost) {
    const jsonBody = JSON.stringify(events);

    function doPostRequest(canRetry) {
      const headers = utils.extend(
        {
          'Content-Type': 'application/json',
          'X-LaunchDarkly-Event-Schema': '3',
        },
        utils.getLDHeaders(platform, options)
      );
      return platform
        .httpRequest('POST', postUrl, headers, jsonBody)
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
      httpFallbackPing && httpFallbackPing(imageUrl + '?d=' + utils.base64URLEncode(jsonBody));
      return Promise.resolve(); // we don't wait for this request to complete, it's just a one-way ping
    }
  }

  sender.sendEvents = function(events) {
    if (!platform.httpRequest) {
      return Promise.resolve();
    }
    const canPost = platform.httpAllowsPost();
    let chunks;
    if (canPost) {
      // no need to break up events into chunks if we can send a POST
      chunks = [events];
    } else {
      chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, events);
    }
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sendChunk(chunks[i], canPost));
    }
    return Promise.all(results);
  };

  return sender;
}
