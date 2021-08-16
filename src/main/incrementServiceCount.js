const core = require('@actions/core');
const aws = require('aws-sdk');

async function run() {
  const service = core.getInput('service', { required: true });
  const cluster = core.getInput('cluster', { required: true });
  const desiredCount = core.getInput('desired-count', { required: true });
  try {
    // Connect to ecs and pull the task definition
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    await ecs.describeTaskDefinition({ service, cluster, desiredCount }).promise();
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;