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

/**
 * When the GitHub Actions job is done, clean up any environment variables that
 * may have been set by the configure-aws-credentials steps in the job.
 *
 * Environment variables are not intended to be shared across different jobs in
 * the same GitHub Actions workflow: GitHub Actions documentation states that
 * each job runs in a fresh instance.  However, doing our own cleanup will
 * give us additional assurance that these environment variables are not shared
 * with any other jobs.
 */

async function cleanup() {
  try {
    // The GitHub Actions toolkit does not have an option to completely unset
    // environment variables, so we overwrite the current value with an empty
    // string. The AWS CLI and AWS SDKs will behave correctly: they treat an
    // empty string value as if the environment variable does not exist.
    core.exportVariable('AWS_ACCESS_KEY_ID', '');
    core.exportVariable('AWS_SECRET_ACCESS_KEY', '');
    core.exportVariable('AWS_SESSION_TOKEN', '');
    core.exportVariable('AWS_DEFAULT_REGION', '');
    core.exportVariable('AWS_REGION', '');
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = cleanup;