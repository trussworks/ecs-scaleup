const run = require('./getTaskDefinition')
const core = require('@actions/core');

jest.mock('@actions/core');

function mockGetInput(requestResponse) {
  return function (name, options) { // eslint-disable-line no-unused-vars
      return requestResponse[name]
  }
}

const FAKE_TASK_DEFINITION = 'fake-task-definition'
const FAKE_REPO_HASH = 'fake-repo-hash'

const NO_INPUTS = {
  'task-definition': '',
  'repository-hash': ''
}
const TASK_DEF_INPUTS = {
  'task-definition': FAKE_TASK_DEFINITION
}

const REPO_HASH_INPUTS = {
  'repository-hash': FAKE_REPO_HASH
}

const mockEcsDescribeTaskDefinition = jest.fn();
jest.mock('aws-sdk', () => {
  return {
    ECS: jest.fn(() => ({
      describeTaskDefinition: mockEcsDescribeTaskDefinition
    }))
  }
})

describe('Get the Task Definition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEcsDescribeTaskDefinition.mockReset();

    mockEcsDescribeTaskDefinition.mockImplementation(() => {
      return {
        promise () {
          return Promise.resolve({
            taskDefinition: {
              family: FAKE_TASK_DEFINITION,
              containerDefinitions: []
            }
          })
        }
      }
    })
  })

  test('if no task definition is supplied, task fails', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(NO_INPUTS))
    await run()
    expect(core.setFailed).toHaveBeenCalled();
  });

  test('calls the describeTaskDefinition function', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(TASK_DEF_INPUTS))
    await run()
    expect(mockEcsDescribeTaskDefinition).toHaveBeenCalled();
  });

  test('returns the task definition', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(TASK_DEF_INPUTS))
    const result = await run();
    expect(JSON.parse(result)).toHaveProperty("family")
    expect(JSON.parse(result)).toHaveProperty("containerDefinitions")
  })

  test('works as long as either task-definition or repo-hash are provided', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(REPO_HASH_INPUTS))
      await run()
  })
})