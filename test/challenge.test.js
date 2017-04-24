/**
 * This test calls an API that attempts a client credentials grant and
 * then fails back to delegated auth upon 401.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus");

describe('Graceful failover from Auth0 api-auth to delegated tokens', function () {

  beforeEach(function() {
    cimpress_client_request.credential_cache.flushAll();
  });

  var config = {
    authorization_server: "https://cimpress.auth0.com/oauth/token",
    audience: "https://api.cimpress.io/",
    client_id: process.env.CIMPRESS_IO_CLIENT_ID,
    client_secret: process.env.CIMPRESS_IO_CLIENT_SECRET,
    refresh_token: process.env.CIMPRESS_IO_REFRESH_TOKEN
  };

  it('Should make a successful request against the backing API', function(done) {
    request({
      auth: config,
      url: process.env.API_THAT_SUPPORTS_DELEGATION
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });
});
