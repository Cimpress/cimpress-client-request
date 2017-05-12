/**
 * This test calls an API that expects a client credentials grant and confirms that the cache was hit.
 */
var cimpress_client_request = require('../'),
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock');

describe('Given a custom key gen function', function () {
  var request;
  var cache;
  var old_cache = cimpress_client_request.credential_cache;
  var valKeyGenReturns = "123abc456"
  var audience = "https://audience.com";
  var expectedKeyWasPassedIn = false;

  beforeEach(function () {
    cache = {
      flushAll: function () { cachedValue = null; },
      set: function (key, value, ttl) {
        if (key != audience) {
          expect(key).to.equal(valKeyGenReturns);
          expectedKeyWasPassedIn = true;
        }
        return;
      },
      get: function (key, callback) {
        if (callback) {
          return callback(null, null);
        }
        else {
          return null;
        }
      },
    };
    cimpress_client_request.set_credential_cache(cache);
    cimpress_client_request.credential_cache.flushAll();
    request = cimpress_client_request;
  });

  var clientId = "abc";
  var clientSecret = "123";
  var url = "https://testing.com";
  var authV2Token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OSJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.uZ5tQFlyMXG0axBjSjmoBi5QcRghBl7weso5o8ZFS4EQpSJOTxWQHMCkI_2oeJo_XXdNdAZR2jXZth_-0GsbDiqrH5vAHZi-Vj1LfS6GQBzWOgADldJxkx3mQ7jnBVNTpuJBLfMrCe-6ixwnQgDcai1TI-wjS-Q6TRT5mvIKGAM";

  var config = {
    audience: audience,
    client_id: clientId,
    client_secret: clientSecret,
  };

  var keyGenFunction = function (method, url, authToken) {
    return valKeyGenReturns;
  }

  after(function () {
    cimpress_client_request.set_credential_cache(old_cache);
  });

  it('Should use the passed in function when saving the response', function (done) {
    nock(url)
      .get('/')
      .reply(function (uri, requestBody) {
        return [200, 'Success!', { 'Cache-Control': 'public, max-age=10', }];
      });

    nock('https://cimpress.auth0.com')
      .post('/oauth/token')
      .reply(function (uri, requestBody) {
        return [200, { access_token: authV2Token }];
      });

    request({
      auth: config,
      url: url,
      keyGen: keyGenFunction,
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      expect(expectedKeyWasPassedIn).to.equal(true);
      done();
    });
  });
});
