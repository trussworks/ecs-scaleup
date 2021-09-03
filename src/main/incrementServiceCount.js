const core = require('@actions/core');
const aws = require('aws-sdk');

async function run() {
  const service = core.getInput('service', { required: true });
  const cluster = core.getInput('cluster', { required: true });
  const desiredCount = core.getInput('desired-count', { required: true });
  try {
    if (!service && !cluster) {
      core.setFailed('You must specify a service and a cluster')
    }
    if (!service) {
      core.setFailed('You must specify a service')
    }
    if (!cluster) {
      core.setFailed('You must specify a cluster')
    }
    // Connect to ecs and pull the task definition
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    await ecs.updateService({ service, cluster, desiredCount }).promise();
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;