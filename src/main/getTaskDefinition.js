const core = require('@actions/core');
const artifact = require('@actions/artifact')
const aws = require('aws-sdk');
const fs = require('fs');

async function run() {
  const taskDefinition = core.getInput('TASK_DEFINITION', { required: true });
  try {
    // Connect to ecs and pull the task definition
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    const taskDefResponse = await ecs.describeTaskDefinition({ taskDefinition }).promise();

    // Generate json
    await fs.writeFile('task-definition.json', JSON.stringify(taskDefResponse.taskDefinition))
    
    // Upload as Artifact
    const artifactClient = artifact.create()
    const artifactName = 'taskDefinition'
    const files = [
      'task-definition.json'
    ]

    const rootDirectory = '.'
    const options = {
      continueOnError: false
    }
    await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)

  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;