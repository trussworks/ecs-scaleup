# ecs-scaleup

The purpose of this repository is to provide a GitHub Action to
scale up an ECS service's desired count.

This action wraps several AWS interactions into one, including existing AWS actions,
which are used with small modifications.

## What it does

1. Configure AWS credentials. Uses existing action:
 [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
2. Log the user into ECR. Uses existing action:
 [aws-actions/amazon-ecr-login](https://github.com/aws-actions/amazon-ecr-login)
3. Use the AWS SDK for JavaScript to grab the desired task definition from AWS
4. Populate the task definition with the desired image. Uses existing action: [aws-actions/amazon-ecs-render-task-definition](https://github.com/aws-actions/amazon-ecs-render-task-definition)
5. Uses the AWS SDK for JavaScript to increment the specified ECS Service's
`desired count` attribute to the desired number
6. Deploy the task definition from step 4. Uses existing action: [aws-actions/amazon-ecs-deploy-task-definition](https://github.com/aws-actions/amazon-ecs-deploy-task-definition)

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

Line 41 is changed to output the whole image path rather than only the RegistryURI.
 This image is accepted as an argument to a subsequent step.

### aws-actions/amazon-ecs-render-task-definition

Path: `src/main/renderTaskDefinition.js`

The run() function is edited to accept the task definition retrieved from
 the `getTaskDefinition.js` module and the image path outputted by `amazonEcrLogin.js`.
Removed usage of the filesystem.

### aws-actions/amazon-ecs-deploy-task-definition

Path: `src/main/deployTaskDefinition.js`

The run() function is edited to accept the new task definition from
 the previous step as an argument. Removed uage of the filesystem.

### Cleanup functions

Path: `src/cleanup/configAwsCreds.js` and `src/cleanup/amazonEcrLogin.js`

No changes

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
