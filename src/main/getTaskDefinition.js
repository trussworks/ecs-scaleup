const core = require('@actions/core');
const aws = require('aws-sdk');

async function run() {
  const taskDefinition = core.getInput('TASK_DEFINITION', { required: true });
  try {
    // Connect to ecs and pull the task definition
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    const taskDefResponse = await ecs.describeTaskDefinition({ taskDefinition }).promise();

    return taskDefResponse.taskDefinition

  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;