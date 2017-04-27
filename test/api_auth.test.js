/**
 * This test calls an API that expects a client credentials grant.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock');

describe('Auth0 api-auth client grants', function () {

  beforeEach(function() {
    cimpress_client_request.credential_cache.flushAll();
  });

  var authServerUrl = "https://authserver.com";
  var audience = "abcd";
  var clientId = "9876";
  var clientSecret = "123456789";
  var url = "https://testing.com";
  var authToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OSJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.uZ5tQFlyMXG0axBjSjmoBi5QcRghBl7weso5o8ZFS4EQpSJOTxWQHMCkI_2oeJo_XXdNdAZR2jXZth_-0GsbDiqrH5vAHZi-Vj1LfS6GQBzWOgADldJxkx3mQ7jnBVNTpuJBLfMrCe-6ixwnQgDcai1TI-wjS-Q6TRT5mvIKGAM";

  var config = {
    authorization_server: authServerUrl,
    audience: audience,
    client_id: clientId,
    client_secret: clientSecret,
  };

  it('Should make a successful request against the backing API', function(done) {

    nock(authServerUrl)
    .post('/')
    .reply(function(uri, requestBody){
      expect(requestBody.audience).to.equal(audience);
      expect(requestBody.client_id).to.equal(clientId);
      expect(requestBody.client_secret).to.equal(clientSecret);
      expect(requestBody.grant_type).to.equal('client_credentials');
      return [200, {access_token: authToken}];
    });

    nock(url)
    .get('/')
    .reply(function(uri, requestBody){
      expect(this.req.headers).to.not.be.null;
      expect(this.req.headers['authorization']).to.not.be.undefined;
      expect(this.req.headers['authorization']).to.equal('Bearer ' + authToken);
      return [200, ''];
    })

    request({
      auth: config,
      url: url
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });
});
