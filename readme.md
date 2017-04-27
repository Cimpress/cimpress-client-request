cimpress-client-request
======
A module for handling generation of OAuth Bearer tokens issued by Auth0 by integrating credential management into request.js.

## Installation

```shell
npm i cimpress-client-request --save
```

or

```shell
yarn add cimpress-client-request
```

### Usage

This module exposes a single method:

```js
module.exports.request = function(config, cb) {}
```

This works as a drop-in replacement for [request](https://github.com/request/request).  Adopting this flow is as simple as these two surgical incisions:

```js
//var request = require('request');
var request = require('cimpress-client-request');
```

```js


// Note the set of 4 possible new options that can be passed in the request.js options.auth object.
// Every other property in the request options object works as normal, and you can call all of the
// convenience methods exposed by request.js.
var options = {
    auth: {
        client_id: 'see below',
        client_secret: 'see below',
        refresh_token: 'see below',
        target_id: 'see below'
    }
};
request(options);
```

Here's how you should use those 4 `auth` parameters:

| Property | Description |
|---|---|
| client_id | The client id you wish to use to request client credential grants (https://auth0.com/docs/api-auth/grant/client-credentials). |
| client_secret | The client secret you wish to use to request client credential grants (https://auth0.com/docs/api-auth/grant/client-credentials). |
| refresh_token | A refresh token for use in delegation flows, retrieved from developer.cimpress.io.  Defaults to the environment variable `CIMPRESS_IO_REFRESH_TOKEN`.  |
| target_id | OPTIONAL The client id for which you are trying to retrieve a delegated token.  Note, if you don't know this, you can rely on a 401 with a `Www-Authenticate` to provide the client id.  If you don't provide this config, and the service doesn't provide that header, your call will fail with a 401. |
| authorization_server | OPTIONAL The server to call to request client credential grants  (https://auth0.com/docs/api-auth/grant/client-credentials).  This defaults to https://cimpress-dev.auth0.com/oauth/token.
| audience | OPTIONAL The audience to send when requesting client credential grants  (https://auth0.com/docs/api-auth/grant/client-credentials).  This defaults to https://api.cimpress.io/ |


You can specify your caching method by calling:

```js
var request = require('cimpress-client-request');
var altCache = require('alternative-caching-library-here');

request.set_credentials_cache = altCache;

```
Note that the alternative caching method you use must support callbacks and have the following function definitions:
* get(key, callback)
* set(key, value, ttl)
* flushAll()

### Tests
You might also want to [look at our tests](https://mcpstash.cimpress.net/projects/CE/repos/cimpress-client-request-node/browse/test) to see some examples of usage.

You can run tests via `grunt` or `grunt test`.

## Development

### Install Nodejs & Grunt

```shell
sudo apt-get install nodejs
```

If you are running Ubuntu you need to create a symlink for node. (There is a naming conflict with the node package).

```shell
sudo ln -s /usr/bin/nodejs /usr/bin/node
```

Install Grunt command line tool:

```shell
sudo npm -g grunt-cli
```

If you see an error about NPM not installed, run the following command to install:

```shell
sudo apt-get install npm
```

### Getting Started from Source

```shell
cd src/
sudo npm install
grunt
```

### Package & Install without pushing to a remote NPM registry

To package:

```shell
npm pack
```

This will generate a tarball gzipped following a file name convention of: &lt;module&gt;-&lt;version&gt;.tgz

To install:

```shell
npm install <path-to-tgz>
```

### git - pre-commit hook

If you would like to run jslint and units tests before your commit then create a file in .git/hooks/pre-commit with execute permissions with the following content:

```shell
#!/bin/sh

grunt --gruntfile $(git rev-parse --show-toplevel)/src/Gruntfile.js
```