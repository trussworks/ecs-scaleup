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
const aws = require('aws-sdk');
const yaml = require('yaml');

const MAX_WAIT_MINUTES = 360;  // 6 hours
const WAIT_DEFAULT_DELAY_SEC = 15;

// Attributes that are returned by DescribeTaskDefinition, but are not valid RegisterTaskDefinition inputs
const IGNORED_TASK_DEFINITION_ATTRIBUTES = [
  'compatibilities',
  'taskDefinitionArn',
  'requiresAttributes',
  'revision',
  'status',
  'registeredAt',
  'deregisteredAt',
  'registeredBy'
];

// Deploy to a service that uses the 'ECS' deployment controller
async function updateEcsService(ecs, clusterName, service, taskDefArn, waitForService, waitForMinutes, forceNewDeployment) {
  core.debug('Updating the service');
  await ecs.updateService({
    cluster: clusterName,
    service: service,
    taskDefinition: taskDefArn,
    forceNewDeployment: forceNewDeployment
  }).promise();
  core.info(`Deployment started. Watch this deployment's progress in the Amazon ECS console: https://console.aws.amazon.com/ecs/home?region=${aws.config.region}#/clusters/${clusterName}/services/${service}/events`);

  // Wait for service stability
  if (waitForService && waitForService.toLowerCase() === 'true') {
    core.debug(`Waiting for the service to become stable. Will wait for ${waitForMinutes} minutes`);
    const maxAttempts = (waitForMinutes * 60) / WAIT_DEFAULT_DELAY_SEC;
    await ecs.waitFor('servicesStable', {
      services: [service],
      cluster: clusterName,
      $waiter: {
        delay: WAIT_DEFAULT_DELAY_SEC,
        maxAttempts: maxAttempts
      }
    }).promise();
  } else {
    core.debug('Not waiting for the service to become stable');
  }
}

function isEmptyValue(value) {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    for (var element of value) {
      if (!isEmptyValue(element)) {
        // the array has at least one non-empty element
        return false;
      }
    }
    // the array has no non-empty elements
    return true;
  }

  if (typeof value === 'object') {
    for (var childValue of Object.values(value)) {
      if (!isEmptyValue(childValue)) {
        // the object has at least one non-empty property
        return false;
      }
    }
    // the object has no non-empty property
    return true;
  }

  return false;
}

function emptyValueReplacer(_, value) {
  if (isEmptyValue(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter(e => !isEmptyValue(e));
  }

  return value;
}

function cleanNullKeys(obj) {
  return JSON.parse(JSON.stringify(obj, emptyValueReplacer));
}

function removeIgnoredAttributes(taskDef) {
  for (var attribute of IGNORED_TASK_DEFINITION_ATTRIBUTES) {
    if (taskDef[attribute]) {
      core.warning(`Ignoring property '${attribute}' in the task definition file. ` +
        'This property is returned by the Amazon ECS DescribeTaskDefinition API and may be shown in the ECS console, ' +
        'but it is not a valid field when registering a new task definition. ' +
        'This field can be safely removed from your task definition file.');
      delete taskDef[attribute];
    }
  }

  return taskDef;
}

function maintainValidObjects(taskDef) {
    if (validateProxyConfigurations(taskDef)) {
        taskDef.proxyConfiguration.properties.forEach((property, index, arr) => {
            if (!('value' in property)) {
                arr[index].value = '';
            }
            if (!('name' in property)) {
                arr[index].name = '';
            }
        });
    }

    if(taskDef && taskDef.containerDefinitions){
      taskDef.containerDefinitions.forEach((container) => {
        if(container.environment){
          container.environment.forEach((property, index, arr) => {
            if (!('value' in property)) {
              arr[index].value = '';
            }
          });
        }
      });
    }
    return taskDef;
}

function validateProxyConfigurations(taskDef){
  return 'proxyConfiguration' in taskDef && taskDef.proxyConfiguration.type && taskDef.proxyConfiguration.type == 'APPMESH' && taskDef.proxyConfiguration.properties && taskDef.proxyConfiguration.properties.length > 0;
}

async function run(newTaskDefinition) {
  try {
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });

    // Get inputs
    const service = core.getInput('service') || `gh-runner-${core.getInput('repository-hash')}`;
    const cluster = core.getInput('cluster') || `gh-runner-${core.getInput('repository-hash')}`;
    const waitForService = 'true' // Forcing this to be required because if it isn't, the runners won't be up in time
    let waitForMinutes = parseInt(core.getInput('wait-for-minutes', { required: false })) || 30;
    if (waitForMinutes > MAX_WAIT_MINUTES) {
      waitForMinutes = MAX_WAIT_MINUTES;
    }

    const forceNewDeployInput = core.getInput('force-new-deployment', { required: false }) || 'false';
    const forceNewDeployment = forceNewDeployInput.toLowerCase() === 'true';

    // Register the task definition
    core.debug('Registering the task definition');
    const taskDefContents = maintainValidObjects(removeIgnoredAttributes(cleanNullKeys(yaml.parse(newTaskDefinition))));
    let registerResponse;
    try {
      registerResponse = await ecs.registerTaskDefinition(taskDefContents).promise();
    } catch (error) {
      core.setFailed("Failed to register task definition in ECS: " + error.message);
      core.debug("Task definition contents:");
      core.debug(JSON.stringify(taskDefContents, undefined, 4));
      throw(error);
    }
    const taskDefArn = registerResponse.taskDefinition.taskDefinitionArn;
    core.setOutput('task-definition-arn', taskDefArn);

    // Update the service with the new task definition
    if (service && service !== 'gh-runner-' && service !== 'gh-runner-undefined') {
      const clusterName = cluster ? cluster : 'default';

      // Determine the deployment controller
      const describeResponse = await ecs.describeServices({
        services: [service],
        cluster: clusterName
      }).promise();

      if (describeResponse.failures && describeResponse.failures.length > 0) {
        const failure = describeResponse.failures[0];
        throw new Error(`${failure.arn} is ${failure.reason}`);
      }

      const serviceResponse = describeResponse.services[0];
      if (serviceResponse.status != 'ACTIVE') {
        throw new Error(`Service is ${serviceResponse.status}`);
      }

      if (!serviceResponse.deploymentController) {
        // Service uses the 'ECS' deployment controller, so we can call UpdateService
        await updateEcsService(ecs, clusterName, service, taskDefArn, waitForService, waitForMinutes, forceNewDeployment);
      } else {
        throw new Error(`Unsupported deployment controller: ${serviceResponse.deploymentController.type}`);
      }
    } else {
      core.debug('Service was not specified, no service updated');
    }
  }
  catch (error) {
    core.setFailed(error.message);
    core.debug(error.stack);
  }
}

module.exports = run;