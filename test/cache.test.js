/**
 * This test calls an API that expects a client credentials grant and confirms that the cache was hit.
 */
var cimpress_client_request = require('../'),
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus");

describe('Given an alternative cache', function () {
var request;
var cache;
var cachedValue;


  beforeEach(function() {
    cache = {
      flushAll: function(){cachedValue = null;},
      set: function(key, value, ttl){
        console.log('Adding to cache');
        console.log(key);
        console.log(value);
        cachedValue = value;},
      get: function(key){return cachedValue;}
    }
    cimpress_client_request.set_credential_cache(cache);
    cimpress_client_request.credential_cache.flushAll();
    request = cimpress_client_request;
  });

  var config = {
    authorization_server: "https://cimpress.auth0.com/oauth/token",
    audience: "https://api.cimpress.io/",
    client_id: process.env.CIMPRESS_IO_CLIENT_ID,
    client_secret: process.env.CIMPRESS_IO_CLIENT_SECRET
  };

  it('Should store the access token in the provided cache', function(done) {

    request({
      auth: config,
      url: process.env.API_THAT_SUPPORTS_CLIENT_GRANTS
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      expect(cachedValue).to.not.be.null;
      done();
    });
  });
});
