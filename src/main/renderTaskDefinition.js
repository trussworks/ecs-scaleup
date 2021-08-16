const core = require('@actions/core');

async function run(taskDefContents, imageURI) {
  try {
    const containerName = core.getInput('container-name', { required: true });

    // Insert the image URI
    if (!Array.isArray(taskDefContents.containerDefinitions)) {
      throw new Error('Invalid task definition format: containerDefinitions section is not present or is not an array');
    }
    const containerDef = taskDefContents.containerDefinitions.find(function(element) {
      return element.name == containerName;
    });
    if (!containerDef) {
      throw new Error('Invalid task definition: Could not find container definition with matching name');
    }
    containerDef.image = imageURI;

    const newTaskDefContents = JSON.stringify(taskDefContents, null, 2);
    return newTaskDefContents
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
