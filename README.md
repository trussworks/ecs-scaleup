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

## Use Case and Usage

This action was developed as a way to dynamically scale up an ECS Service to a
desired number of instances, where those instances represent GitHub Self-Hosted Runners.

```yaml
- name: ecs-scaleup
  uses: trussworks/action-provision-github-runner@f9a837df0e6d249f759016d5e31bf6e8ec204188
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
    ecr_repository: github-runner
    image_tag: latest
    container-name: dev-mac-fc-infra
    task-definition: github-runner-dev
    service: github-actions-runner
    cluster: github-runner
    desired-count: 3
```

## See Also

This action should be paired with the trussworks/ecs-scaledown action.
