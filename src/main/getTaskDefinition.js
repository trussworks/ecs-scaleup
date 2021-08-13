const core = require('@actions/core');
const aws = require('aws-sdk');

async function run() {
  const taskDefinition = core.getInput('TASK_DEFINITION', { required: true });
  try {
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    const taskDefResponse = await ecs.describeTaskDefinition({ taskDefinition: taskDefinition }).promise();
    fs.writeFile('task-definition.json', JSON.stringify(taskDefResponse.taskDefinition))    
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;