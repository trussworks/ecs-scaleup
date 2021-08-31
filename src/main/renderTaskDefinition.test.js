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
const run = require('./renderTaskDefinition');
const core = require('@actions/core');

jest.mock('@actions/core');

const FAKE_TASK_DEFINITION = 'fake-task-definition'
const FAKE_IMAGE_URI = 'fake-image-uri'

describe('Render task definition', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest');        // image

        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });
        process.env = Object.assign(process.env, { RUNNER_TEMP: '/home/runner/work/_temp' });

        // tmp.fileSync.mockReturnValue({
        //     name: 'new-task-def-file-name'
        // });

        // fs.existsSync.mockReturnValue(true);

        // jest.mock('./task-definition.json', () => ({
        //     family: 'task-def-family',
        //     containerDefinitions: [
        //         {
        //             name: "web",
        //             image: "some-other-image"
        //         },
        //         {
        //             name: "sidecar",
        //             image: "hello"
        //         }
        //     ]
        // }), { virtual: true });
    });

    // test('renders the task definition and creates a new task def file', async () => {
    //     await run();
    //     expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
    //         tmpdir: '/home/runner/work/_temp',
    //         prefix: 'task-definition-',
    //         postfix: '.json',
    //         keep: true,
    //         discardDescriptor: true
    //       });
    //     expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
    //         JSON.stringify({
    //             family: 'task-def-family',
    //             containerDefinitions: [
    //                 {
    //                     name: "web",
    //                     image: "nginx:latest"
    //                 },
    //                 {
    //                     name: "sidecar",
    //                     image: "hello"
    //                 }
    //             ]
    //         }, null, 2)
    //     );
    //     expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    // });

    // test('renders a task definition at an absolute path', async () => {
    //     core.getInput = jest
    //         .fn()
    //         .mockReturnValueOnce('/hello/task-definition.json') // task-definition
    //         .mockReturnValueOnce('web')                  // container-name
    //         .mockReturnValueOnce('nginx:latest');        // image
    //     jest.mock('/hello/task-definition.json', () => ({
    //         family: 'task-def-family',
    //         containerDefinitions: [
    //             {
    //                 name: "web",
    //                 image: "some-other-image"
    //             }
    //         ]
    //     }), { virtual: true });

    //     await run();

    //     expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
    //         tmpdir: '/home/runner/work/_temp',
    //         prefix: 'task-definition-',
    //         postfix: '.json',
    //         keep: true,
    //         discardDescriptor: true
    //       });
    //     expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
    //         JSON.stringify({
    //             family: 'task-def-family',
    //             containerDefinitions: [
    //                 {
    //                     name: "web",
    //                     image: "nginx:latest"
    //                 }
    //             ]
    //         }, null, 2)
    //     );
    //     expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    // });

    // test('error returned for missing task definition file', async () => {
    //     fs.existsSync.mockReturnValue(false);
    //     core.getInput = jest
    //         .fn()
    //         .mockReturnValueOnce('does-not-exist-task-definition.json')
    //         .mockReturnValueOnce('web')
    //         .mockReturnValueOnce('nginx:latest');

    //     await run();

    //     expect(core.setFailed).toBeCalledWith('Task definition file does not exist: does-not-exist-task-definition.json');
    // });

    test('error returned for non-JSON task definition contents', async () => {
        jest.mock('./non-json-task-definition.json', () => ("hello"), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('non-json-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
    });

    test('error returned for malformed task definition with non-array container definition section', async () => {
        jest.mock('./malformed-task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: {}
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('malformed-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
    });

    test('error returned for task definition without matching container name', async () => {
        jest.mock('./missing-container-task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "main",
                    image: "some-other-image"
                }
            ]
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('missing-container-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition: Could not find container definition with matching name');
    });
});