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
const cleanup = require('./configAwsCreds.js');

jest.mock('@actions/core');

const FAKE_ACCESS_KEY_ID = 'MY-AWS-ACCESS-KEY-ID';
const FAKE_SECRET_ACCESS_KEY = 'MY-AWS-SECRET-ACCESS-KEY';
const FAKE_SESSION_TOKEN = 'MY-AWS-SESSION-TOKEN';
const FAKE_REGION = 'fake-region-1';
const ACTION_ENVIRONMENT_VARIABLES = {
    AWS_ACCESS_KEY_ID: FAKE_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: FAKE_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: FAKE_SESSION_TOKEN,
    AWS_DEFAULT_REGION: FAKE_REGION,
    AWS_REGION: FAKE_REGION,
};

describe('Configure AWS Credentials', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV, ...ACTION_ENVIRONMENT_VARIABLES};
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    test('replaces AWS credential and region env vars with empty strings', async () => {
        await cleanup();
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(core.exportVariable).toHaveBeenCalledTimes(5);
        expect(core.exportVariable).toHaveBeenCalledWith('AWS_ACCESS_KEY_ID', '');
        expect(core.exportVariable).toHaveBeenCalledWith('AWS_SECRET_ACCESS_KEY', '');
        expect(core.exportVariable).toHaveBeenCalledWith('AWS_SESSION_TOKEN', '');
        expect(core.exportVariable).toHaveBeenCalledWith('AWS_DEFAULT_REGION', '');
        expect(core.exportVariable).toHaveBeenCalledWith('AWS_REGION', '');
    });

    test('error is caught and fails the action', async () => {
        core.exportVariable.mockReset();
        core.exportVariable.mockImplementation(() => {
            throw new Error();
        });

        await cleanup();

        expect(core.setFailed).toBeCalled();
    });
});