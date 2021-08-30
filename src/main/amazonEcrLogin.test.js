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
const run = require('./amazonEcrLogin.js');
const core = require('@actions/core');
const exec = require('@actions/exec');

jest.mock('@actions/core');
jest.mock('@actions/exec');

function mockGetInput(requestResponse) {
    return function (name, options) { // eslint-disable-line no-unused-vars
        return requestResponse[name]
    }
}

const DEFAULT_INPUTS = {
    'ecr-repository': "fake-repository",
    'image-tag': "fake-image-tag"
};

const mockEcrGetAuthToken = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        ECR: jest.fn(() => ({
            getAuthorizationToken: mockEcrGetAuthToken
        }))
    };
});

describe('Login to ECR', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockImplementation(mockGetInput(DEFAULT_INPUTS));

        mockEcrGetAuthToken.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({
                        authorizationData: [
                            {
                                authorizationToken: Buffer.from('hello:world').toString('base64'),
                                proxyEndpoint: 'https://123456789012.dkr.ecr.aws-region-1.amazonaws.com'
                            }
                       ]
                    });
                }
            };
        });

        exec.exec.mockReturnValue(0);
    });

    test('gets auth token from ECR', async () => {
        await run();
        expect(mockEcrGetAuthToken).toHaveBeenCalled();
    });

    test('returns the full registry URL', async () => {
        const result = await run();
        expect(result).toBe("123456789012.dkr.ecr.aws-region-1.amazonaws.com/fake-repository:fake-image-tag")
    });

    test('error is caught by core.setFailed for ECR call', async () => {
        mockEcrGetAuthToken.mockImplementation(() => {
            throw new Error();
        });

        await run();

        expect(core.setFailed).toBeCalled();
        expect(core.setOutput).toHaveBeenCalledTimes(0);
        expect(core.saveState).toHaveBeenCalledTimes(0);
    });
});