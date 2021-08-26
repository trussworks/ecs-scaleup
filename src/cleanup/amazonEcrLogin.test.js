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
const cleanup = require('./amazonEcrLogin.js');
const core = require('@actions/core');
const exec = require('@actions/exec');

jest.mock('@actions/core');
jest.mock('@actions/exec');

describe('Logout from ECR', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getState.mockReturnValue(
            '123456789012.dkr.ecr.aws-region-1.amazonaws.com,111111111111.dkr.ecr.aws-region-1.amazonaws.com');
        exec.exec.mockReturnValue(0);
    });

    test('logs out docker client for registries in action state', async () => {
        await cleanup();

        expect(core.getState).toHaveBeenCalledWith('registries');

        expect(exec.exec).toHaveBeenCalledTimes(2);
        expect(exec.exec).toHaveBeenNthCalledWith(1,
            'docker logout',
            ['123456789012.dkr.ecr.aws-region-1.amazonaws.com'],
            expect.anything());
        expect(exec.exec).toHaveBeenNthCalledWith(2,
            'docker logout',
            ['111111111111.dkr.ecr.aws-region-1.amazonaws.com'],
            expect.anything());

        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('handles zero registries', async () => {
        core.getState.mockReturnValue('');

        await cleanup();

        expect(core.getState).toHaveBeenCalledWith('registries');

        expect(exec.exec).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('error is caught by core.setFailed for failed docker logout', async () => {
        exec.exec.mockReturnValue(1);

        await cleanup();

        expect(core.setFailed).toBeCalled();
    });

    test('continues to attempt logouts after a failed logout', async () => {
        core.getState.mockReturnValue(
            '123456789012.dkr.ecr.aws-region-1.amazonaws.com,111111111111.dkr.ecr.aws-region-1.amazonaws.com,222222222222.dkr.ecr.aws-region-1.amazonaws.com');
        exec.exec.mockReturnValueOnce(1).mockReturnValueOnce(1).mockReturnValueOnce(0);

        await cleanup();

        expect(core.getState).toHaveBeenCalledWith('registries');

        expect(exec.exec).toHaveBeenCalledTimes(3);
        expect(exec.exec).toHaveBeenNthCalledWith(1,
            'docker logout',
            ['123456789012.dkr.ecr.aws-region-1.amazonaws.com'],
            expect.anything());
        expect(exec.exec).toHaveBeenNthCalledWith(2,
            'docker logout',
            ['111111111111.dkr.ecr.aws-region-1.amazonaws.com'],
            expect.anything());
        expect(exec.exec).toHaveBeenNthCalledWith(3,
            'docker logout',
            ['222222222222.dkr.ecr.aws-region-1.amazonaws.com'],
            expect.anything());

        expect(core.error).toHaveBeenCalledTimes(2);
        expect(core.error).toHaveBeenNthCalledWith(1, 'Could not logout registry 123456789012.dkr.ecr.aws-region-1.amazonaws.com: ');
        expect(core.error).toHaveBeenNthCalledWith(2, 'Could not logout registry 111111111111.dkr.ecr.aws-region-1.amazonaws.com: ');

        expect(core.setFailed).toHaveBeenCalledTimes(1);
        expect(core.setFailed).toHaveBeenCalledWith('Failed to logout: 123456789012.dkr.ecr.aws-region-1.amazonaws.com,111111111111.dkr.ecr.aws-region-1.amazonaws.com');
    });
});