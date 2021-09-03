# ecs-scaleup

The purpose of this repository is to provide a GitHub Action to
scale up an ECS service's desired count.

This action wraps several AWS interactions into one, including existing AWS actions,
which are used with small modifications.
Since GitHub Actions currently does not allow
 composite actions to call other actions,
  we chose to integrate the JavaScript code
   from existing aws-actions into this repository.

## What it does

1. Configure AWS credentials. Uses existing action:
 [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
2. Generate a complete image URI for the ECR-hosted image to use. Uses logic from this action, but cuts down a lot of the workflow:
 [aws-actions/amazon-ecr-login](https://github.com/aws-actions/amazon-ecr-login)
3. Use the AWS SDK for JavaScript to grab the desired task definition from AWS
4. Populate the task definition with the desired image. Starting with logic from the existing action: [aws-actions/amazon-ecs-render-task-definition](https://github.com/aws-actions/amazon-ecs-render-task-definition), this is now just a simple JavaScript function to plug the new image URI into the task definition fetched from step 3
5. Uses the AWS SDK for JavaScript to increment the specified ECS Service's
`desired count` attribute to the desired number
6. Deploy the task definition from step 4. Started from existing action: [aws-actions/amazon-ecs-deploy-task-definition](https://github.com/aws-actions/amazon-ecs-deploy-task-definition). Removed usage of CodeDeploy and refactored to use task definition from step 4 instead of a file path.

## Modifications made to existing AWS actions

Any instances of `core.setOutput` have been modified to return
 the item instead so that it can be passed to the next function.

All instances of

```js
if (require.main === module) {
    run();
}
```

have been removed from files other than `index.js`.

### aws-actions/configure-aws-credentials

Path: `src/main/configAwsCreds.js`

No other changes

### aws-actions/amazon-ecr-login

Path: `src/main/amazonEcrLogin.js`

Since no docker commands are being executed in the container, most of the logic of this action was trimmed from the final ecs-scaleup.

We have kept the authorization token request which depends on config aws creds successfully setting up the login, then retrieve the correct registryURI.

 This image is accepted as an argument to a subsequent step.

### aws-actions/amazon-ecs-render-task-definition

Path: `src/main/renderTaskDefinition.js`

This function is now a simple JavaScript function to just take the task definition obtained from `getTaskDefinition.js` and plug in the new imageURI.

### aws-actions/amazon-ecs-deploy-task-definition

Path: `src/main/deployTaskDefinition.js`

The run() function is edited to accept the new task definition from
 the previous step as an argument. Removed uage of the filesystem and removed CodeDeploy provisioning to clean up code we won't need.

### Cleanup functions

Path: `src/cleanup/configAwsCreds.js`

No changes. Removed the amazonEcrLogin cleanup function because there is no docker login, so nothing to clean up.

## Use Case and Usage

This action was developed as a way to dynamically scale up an ECS Service to a
desired number of instances, where those instances represent GitHub Self-Hosted Runners.

```yaml
ecs-scaleup:
  name: Scale up ECS service
  runs-on: ubuntu-latest
  steps:
    - name: ecs-scaleup
      uses: trussworks/ecs-scaleup@f9f61a55ff0565859d3fbfeabdfd603c9acf3387
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
        ecr-repository: github-runner
        image-tag: latest
        container-name: dev-mac-fc-infra
        task-definition: github-runner-dev
        service: github-actions-runner
        cluster: github-runner
        desired-count: 3
```

**NOTE**: If using this action to stand up self-hosted runners,
 any subsequent jobs should have:

```yaml
needs: ecs-scaleup
```

in its YAML configuration.

## See Also

This action should be paired with the trussworks/ecs-scaledown action.
