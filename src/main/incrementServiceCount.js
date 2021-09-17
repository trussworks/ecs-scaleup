const core = require('@actions/core');
const aws = require('aws-sdk');

async function run() {
  const service = core.getInput('service') || `gh-runner-${core.getInput('repository-hash')}`;
  const cluster = core.getInput('cluster') || `gh-runner-${core.getInput('repository-hash')}`;
  const desiredCount = core.getInput('desired-count', { required: true });
  try {
    if (service === 'gh-runner-' && cluster === 'gh-runner-') {
      core.setFailed('You must specify a service and a cluster')
    }
    if (service === 'gh-runner-') {
      core.setFailed('You must specify a service')
    }
    if (cluster === 'gh-runner-') {
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