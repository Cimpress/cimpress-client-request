/**
 * This test calls an API that expects a client credentials grant and confirms that the cache was hit.
 */
var cimpress_client_request = require('../'),
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock');

describe('Given an alternative cache', function () {
  var request;
  var cache;
  var testing_what_we_claim_to_test;
  var old_cache = cimpress_client_request.credential_cache;
  var audience = "https://audience.com";

  beforeEach(function () {
    testing_what_we_claim_to_test = false;
    cache = {
      flushAll: function () { cachedValue = null; },
      set: function (key, value, ttl) {
        console.log(key);
        testing_what_we_claim_to_test = true;
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

  after(function () {
    cimpress_client_request.set_credential_cache(old_cache);
  });

  it('Should store the access token in the provided cache', function (done) {
    nock(url)
      .get('/')
      .reply(function (uri, requestBody) {
        return [200, 'Success!'];
      });

    nock('https://cimpress.auth0.com')
      .post('/oauth/token')
      .reply(function (uri, requestBody) {
        return [200, { access_token: authV2Token }];
      });

    request({
      auth: config,
      url: url
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      expect(testing_what_we_claim_to_test).to.equal(true);
      done();
    });
  });
});
