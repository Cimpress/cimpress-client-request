/**
 * This test calls an API that attempts a client credentials grant and
 * then fails back to delegated auth upon 401.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock');

describe('Graceful failover from Auth0 api-auth to delegated tokens', function () {

  beforeEach(function () {
    cimpress_client_request.credential_cache.flushAll();
  });

  var audience = "https://audience.com";
  var clientId = "1234";
  var clientSecret = "5678";
  var refreshToken = "12345678";
  var url = "https://testing.com";
  var authV2Token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OSJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.uZ5tQFlyMXG0axBjSjmoBi5QcRghBl7weso5o8ZFS4EQpSJOTxWQHMCkI_2oeJo_XXdNdAZR2jXZth_-0GsbDiqrH5vAHZi-Vj1LfS6GQBzWOgADldJxkx3mQ7jnBVNTpuJBLfMrCe-6ixwnQgDcai1TI-wjS-Q6TRT5mvIKGAM";
  var authV1Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";
  var callingClientId = "abcd";
  var v1AuthServer = "https://v1auth.com";

  var config = {
    audience: audience,
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  };

  it('Should make a successful request against the backing API', function (done) {
    nock('https://cimpress.auth0.com')
      .post('/oauth/token')
      .reply(function (uri, requestBody) {
        expect(requestBody.audience).to.equal(audience);
        expect(requestBody.client_id).to.equal(clientId);
        expect(requestBody.client_secret).to.equal(clientSecret);
        expect(requestBody.grant_type).to.equal('client_credentials');
        return [200, { access_token: authV2Token }];
      })
      .post('/delegation')
      .reply(function (uri, requestBody) {
        expect(requestBody.client_id).to.equal('QkxOvNz4fWRFT6vcq79ylcIuolFz2cwN');
        expect(requestBody.target).to.equal(callingClientId);
        expect(requestBody.refresh_token).to.equal(refreshToken);
        return [200, { 'id_token': authV1Token }];
      });

    nock(url)
      .get('/')
      .twice()
      .reply(function (uri, requestBody) {
        expect(this.req.headers).to.not.be.null;
        expect(this.req.headers['authorization']).to.not.be.undefined;
        if (this.req.headers['authorization'] === 'Bearer ' + authV2Token) {  //v2
          return [401, 'v2 not supported', { 'www-authenticate': 'Bearer realm="' + v1AuthServer + '", scope="client_id=' + callingClientId + ' service=' + url + '"' }];
        } else {
          expect(this.req.headers['authorization']).to.be.equal('Bearer ' + authV1Token);
          return [200, 'v1 supported!'];
        }
      });

    request({
      auth: config,
      url: url
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });
});
