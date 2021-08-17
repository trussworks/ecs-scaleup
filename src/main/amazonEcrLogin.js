/**
MIT License

Copyright 2019 Amazon.com, Inc. or its affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

const core = require('@actions/core');
const exec = require('@actions/exec');
const aws = require('aws-sdk');

async function run() {
  const registryUriState = [];
  const skipLogout = core.getInput('skip-logout', { required: false });
  const ecrRepository = core.getInput('ECR_REPOSITORY', { required: true });
  const imageTag = core.getInput('IMAGE_TAG', { required: false })

  try {
    const registries = core.getInput('registries', { required: false });

    // Get the ECR authorization token
    const ecr = new aws.ECR({
      customUserAgent: 'amazon-ecr-login-for-github-actions'
    });
    const authTokenRequest = {};
    if (registries) {
      const registryIds = registries.split(',');
      core.debug(`Requesting auth token for ${registryIds.length} registries:`);
      for (const id of registryIds) {
        core.debug(`  '${id}'`);
      }
      authTokenRequest.registryIds = registryIds;
    }
    const authTokenResponse = await ecr.getAuthorizationToken(authTokenRequest).promise();
    if (!Array.isArray(authTokenResponse.authorizationData) || !authTokenResponse.authorizationData.length) {
      throw new Error('Could not retrieve an authorization token from Amazon ECR');
    }

    for (const authData of authTokenResponse.authorizationData) {
      const authToken = Buffer.from(authData.authorizationToken, 'base64').toString('utf-8');
      const creds = authToken.split(':', 2);
      const proxyEndpoint = authData.proxyEndpoint;
      const registryUri = proxyEndpoint.replace(/^https?:\/\//,'');

      if (authTokenResponse.authorizationData.length == 1) {
        // !Edited by Trussworks to output the full image path
        // output the registry URI if this action is doing a single registry login
        return `${registryUri}/${ecrRepository}:${imageTag}`
      }

      // Execute the docker login command
      let doLoginStdout = '';
      let doLoginStderr = '';
      const exitCode = await exec.exec('docker login', ['-u', creds[0], '-p', creds[1], proxyEndpoint], {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data) => {
            doLoginStdout += data.toString();
          },
          stderr: (data) => {
            doLoginStderr += data.toString();
          }
        }
      });

      if (exitCode != 0) {
        core.debug(doLoginStdout);
        throw new Error('Could not login: ' + doLoginStderr);
      }

      registryUriState.push(registryUri);
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }

  // Pass the logged-in registry URIs to the post action for logout
  if (registryUriState.length) {
    if (!skipLogout) {
        core.saveState('registries', registryUriState.join());
    }
    core.debug(`'skip-logout' is ${skipLogout} for ${registryUriState.length} registries.`);
  }
}

module.exports = run;