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

jest.mock('@actions/core');

describe('Render task definition', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('actually changes the contents of the task Definition', () => {
        const fakeTaskDefinition = {
            family: 'fake-task-def-family',
            containerDefinitions: [
                {
                    name: 'fake-definition-name',
                    image: 'a-fake-image'
                }
            ]
        }
        const fakeImageURI = 'a-different-fake-image'
        const newTaskDefinition = run(fakeTaskDefinition, fakeImageURI)
        expect(JSON.parse(newTaskDefinition)).toHaveProperty('containerDefinitions')
        expect(JSON.parse(newTaskDefinition).containerDefinitions).toHaveLength(1)
        expect(JSON.parse(newTaskDefinition).containerDefinitions[0].image).toBe('a-different-fake-image')
    });
});