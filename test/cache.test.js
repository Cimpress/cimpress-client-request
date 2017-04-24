/**
 * This test calls an API that expects a client credentials grant and confirms that the cache was hit.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus");

describe('Auth0 api-auth client grants', function () {
var cache;


  beforeEach(function() {
    
    cimpress_client_request.credential_cache.flushAll();
  });

  var config = {
    authorization_server: "https://cimpress-dev.auth0.com/oauth/token",
    audience: "https://development.api.cimpress.io/",
    client_id: process.env.CIMPRESS_IO_CLIENT_ID,
    client_secret: process.env.CIMPRESS_IO_CLIENT_SECRET
  };

  it('Should make a successful request against the backing API', function(done) {

    request({
      auth: config,
      url: process.env.API_THAT_SUPPORTS_CLIENT_GRANTS
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });
});
