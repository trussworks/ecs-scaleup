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

async function run(taskDefContents, imageURI) {
  try {
    // const containerName = core.getInput('container-name', { required: true });

    // Insert the image URI
    // if (!Array.isArray(taskDefContents.containerDefinitions)) {
    //   throw new Error('Invalid task definition format: containerDefinitions section is not present or is not an array');
    // }
    // const containerDef = taskDefContents.containerDefinitions.find(function(element) {
    //   return element.name == containerName;
    // });
    // if (!containerDef) {
    //   throw new Error('Invalid task definition: Could not find container definition with matching name');
    // }
    taskDefContents.containerDefinitions[0].image = imageURI

    const newTaskDefContents = JSON.stringify(taskDefContents, null, 2);
    return newTaskDefContents
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
