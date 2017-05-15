var _ = require('lodash');
var jwt = require('jsonwebtoken');
var request = require('request');
var nodeCache = require('node-cache');
var parseCacheControl = require('parse-cache-control');

var credential_cache = new nodeCache({ useClones: false });
var keyGenFunc = construct_cache_key;

var logger = console.log;

var REFRESH_TOKEN_CLIENT_ID = process.env.DEFAULT_TARGET_ID || 'QkxOvNz4fWRFT6vcq79ylcIuolFz2cwN';

var construct_cache_key = function (method, url, authToken) {
  var decodedToken = jwt.decode(authToken);
  if (decodedToken && decodedToken.sub) {
    return "" + method + "-" + url + "-" + decodedToken.sub;
  } else {
    return "" + method + "-" + url;
  }
};

var check_cache_for_response = function (method, url, authToken, callback) {
  var cacheKey = keyGenFunc(method, url, authToken);
  credential_cache.get(cacheKey, function (err, data) {
    if (err) {
      logger(err);
      return callback(err);
    } else {
      if (data) {
        return callback(err, JSON.parse(data));
      }
      return callback(err, data);
    }
  });
};

var parse_cache_control_header = function (headers) {
  if (headers) {
    if (headers["Cache-Control"]) {
      return parseCacheControl(headers["Cache-Control"])['max-age'] || 0;
    } else if (headers["cache-control"]) {
      return parseCacheControl(headers["cache-control"])['max-age'] || 0;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

var save_response_in_cache = function (method, url, authToken, res, body) {
  var cacheKey = keyGenFunc(method, url, authToken);
  var cacheControl = parse_cache_control_header(res.headers);
  if (cacheControl) {
    credential_cache.set(
      cacheKey,
      JSON.stringify({
        res: res,
        body: body,
      }),
      cacheControl)
  }
  return;
};

var retrieve_client_grant = function (config, cb) {
  var audience = config.audience || 'https://api.cimpress.io/';
  var client_grant_options = {
    method: 'POST',
    url: config.authorization_server || 'https://cimpress.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audience: audience,
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'client_credentials'
    })
  };

  credential_cache.get(audience, function (error, jwt_obj) {
    if (error) {
      logger("Error when retrieving v2 access token from cache", error);
    }

    if (jwt_obj) {
      logger("Found cached credential %s", audience);
      return cb(null, jwt_obj);
    }

    request(client_grant_options, function (err, response, body) {
      if (err) {
        return cb(err);
      }

      try {
        body = JSON.parse(body);
      } catch (e) {
        return cb('Invalid JSON response from Auth0: ' + body);
      }

      // Store the jwt keyed on the audience
      var jwt_obj = jwt.decode(body.access_token);
      credential_cache.set(audience, body.access_token, jwt_obj.exp - jwt_obj.iat);

      return cb(null, body.access_token);
    });
  });
};

var retrieve_delegated_token = function (config, cb) {

  var delegation_options = {
    method: 'POST',
    url: config.authorization_server || 'https://cimpress.auth0.com/delegation',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: REFRESH_TOKEN_CLIENT_ID,
      target: config.target_id,
      refresh_token: config.refresh_token || process.env.CIMPRESS_IO_REFRESH_TOKEN,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      api_type: 'app',
      scope: config.scope || 'openid'
    })
  };

  // Check for target_id from cimpress.io portal
  credential_cache.get(config.target_id, function (error, jwt_obj) {
    if (error) {
      logger("Retrieving v1 token from cache returned error:", error);
    }
    
    if (jwt_obj) {
      logger("Found cached credential %s", config.target_id);
      return cb(null, jwt_obj);
    }

    request(delegation_options, function (err, response, body) {
      if (err) {
        return cb(err);
      }

      try {
        body = JSON.parse(body);
      } catch (e) {
        return cb('Invalid JSON response from Auth0: ' + body);
      }

      // Store the jwt keyed on the audience
      var jwt_obj = jwt.decode(body.id_token);
      credential_cache.set(config.target_id, body.id_token, jwt_obj.exp - jwt_obj.iat);

      return cb(null, body.id_token);
    });
  });
};

/**
 * Given an HTTP response, generate and return a configuration object suitable for passing as
 * the first parameter of compute_bearer.  If no suitable config can be generated due to the
 * absence of Www-Authenticate headers, this method returns undefined.
 */
var parse_auth_headers = module.exports.parse_auth_headers = function (config, res) {
  if (res.headers['www-authenticate']) {
    var matches = res.headers['www-authenticate'].match(/client_id=([^\s]+)/);
    if (matches.length > 0) {
      return {
        refresh_token: config.refresh_token,
        target_id: matches[1]
      };
    }
  }
};

/**
 * Return a request.js instance that wraps a custom request builder responsible for authenticating
 * all calls with an OAuth Bearer token from Auth0, whether retrieved via a client credentials grant
 * flow (preferred) or via delegation.
 */
module.exports = (function () {
  var request_builder = function (options, callback) {

    if (!options.method) {
      options.method = 'GET';
    }

    keyGenFunc = options.keyGen || construct_cache_key;

    var retry_loop = function () {
      // Look for a retry_count property in options
      options.retry_count = options.retry_count + 1 || 1;

      logger("Retrying in %sms", 200 << options.retry_count);

      setTimeout(function () {
        request_builder(options, callback);
      }, 200 << options.retry_count);
    };

    var v1auth = function (res) {
      // If we got an unauthorized since this API doesn't support client grant flows, we
      // pass the response to parse_auth_headers to find a config that might work better.
      var delegate_config = res ? parse_auth_headers(options.auth, res) : options.auth;

      // Validate whether we have enough information to authenticate
      if (!(delegate_config && delegate_config.refresh_token && delegate_config.target_id)) {
        if (res) return callback(new Error('Not enough information for a delegation call'));
        logger("No v1 auth possible.  Attempting an unauthenticated request");
        return request(_.omit(options, ['auth']), function (err, res, body) {
          if (res.statusCode === 401) v1auth(res);
          else callback(err, res, body);
        });
      }

      retrieve_delegated_token(delegate_config, function (err, tok) {

        if (err) {
          logger(err);
          return retry_loop();
        }

        options.auth.bearer = tok;

        check_cache_for_response(options.method, options.url, options.auth.bearer, function (err, cachedResponse) {

          if (err) {
            logger(err);
            return callback(err);
          }

          if (cachedResponse) {
            return callback(err, cachedResponse.res, cachedResponse.body);
          } else {
            request(options, function (err, res, body) {
              // If we get a 401 on even delegated auth, return to caller.
              if (res && res.statusCode === 401) {
                return callback(err, res, body);
              }

              // On a connection error, enter exponential backoff protocol
              if (err) {
                return retry_loop();
              }

              if (res.statusCode >= 200 && res.statusCode < 300) {
                save_response_in_cache(options.method, options.url, options.auth.bearer, res, body);
              }
              return callback(err, res, body);
            });
          }
        });
      });
    };

    var v2auth = function () {

      // Validate whether we have enough information to attempt authentication
      if (!(options.auth && options.auth.client_id && options.auth.client_secret)) {
        logger("No v2 auth possible. Falling back to v1.");
        return v1auth();
      }

      retrieve_client_grant(options.auth, function (err, tok) {

        if (err) {
          logger(err);
          return retry_loop();
        }

        options.auth.bearer = tok;

        check_cache_for_response(options.method, options.url, options.auth.bearer, function (err, cachedResponse) {

          if (err) {
            logger(err);
            return callback(err);
          }

          if (cachedResponse) {
            return callback(err, cachedResponse.res, cachedResponse.body);
          } else {
            request(options, function (err, res, body) {

              // If we got a 401, move on to v1auth
              if (res && res.statusCode === 401) {
                return v1auth(res);
              }

              // On a connection error, enter exponential backoff protocol
              if (err) {
                return retry_loop();
              }

              if (res.statusCode >= 200 && res.statusCode < 300) {
                save_response_in_cache(options.method, options.url, options.auth.bearer, res, body);
              }
              return callback(err, res, body);
            });
          }
        });
      });
    };

    var passedInAuth = function () {
      if (options.auth && options.auth.bearer) {

        check_cache_for_response(options.method, options.url, options.auth.bearer, function (err, cachedResponse) {
          if (cachedResponse) {
            return callback(null, cachedResponse.res, cachedResponse.body);
          } else {
            request(options, function (err, res, body) {

              // If we got a 401, move on to v2auth
              if (res && res.statusCode === 401) {
                return v2auth();
              }

              // On a connection error, enter exponential backoff protocol
              if (err) {
                return retry_loop();
              }

              if (res.statusCode >= 200 && res.statusCode < 300) {
                save_response_in_cache(options.method, options.url, options.auth.bearer, res, body);
              }
              return callback(err, res, body);
            });
          }
        });
      }
      else {
        logger("No token passed in. Falling back to v2.");
        return v2auth();
      }
    }

    // Try pre-set auth token first
    return passedInAuth();
  };

  return request.defaults(request_builder);
})();

module.exports.credential_cache = credential_cache;

module.exports.set_credential_cache = function (altCache) {
  credential_cache = altCache;
};

module.exports.set_logger = function (l) {
  logger = l;
};
