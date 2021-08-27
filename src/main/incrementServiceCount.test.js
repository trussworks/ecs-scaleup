const core = require('@actions/core');
const run = require('./incrementServiceCount.js');

jest.mock('@actions/core');

const FAKE_SERVICE = 'fake-service'
const FAKE_CLUSTER = 'fake-cluster'
const FAKE_DESIRED_COUNT = 1

function mockGetInput(requestResponse) {
  return function (name, options) { // eslint-disable-line no-unused-vars
      return requestResponse[name]
  }
}

const NO_INPUTS = {}
const SERVICE_ONLY = {
  service: FAKE_SERVICE,
  "desired-count": FAKE_DESIRED_COUNT
}
const CLUSTER_ONLY = {
  cluster: FAKE_CLUSTER,
  "desired-count": FAKE_DESIRED_COUNT
}
const ALL_INPUTS = {
  service: FAKE_SERVICE,
  cluster: FAKE_CLUSTER,
  "desired-count": FAKE_DESIRED_COUNT
}

const mockUpdateService = jest.fn()

jest.mock('aws-sdk', () => {
  return {
    ECS: jest.fn(() => ({
      updateService: mockUpdateService
    }))
  }
})

describe('Increment Service Count', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdateService.mockReset();
    mockUpdateService
      .mockReturnValueOnce({
        promise() {
          return Promise.resolve({ service: {
            desiredCount: 1
          }})
        }
      })
  })

  test('action fails when service and cluster are not set', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(NO_INPUTS))
    await run();

    expect(core.setFailed)
  })

  test('action fails when cluster is not set', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(SERVICE_ONLY))
    await run();

    expect(core.setFailed)
  })

  test('action fails when service is not set', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(CLUSTER_ONLY))
    await run();

    expect(core.setFailed)
  })

  test('when a valid cluster and service are provided, function runs successfully', async () => {
    core.getInput = jest
      .fn()
      .mockImplementation(mockGetInput(ALL_INPUTS))
    await run();
    expect(mockUpdateService).toHaveBeenCalledTimes(1)
    expect(mockUpdateService).toHaveBeenNthCalledWith(1, {'service': FAKE_SERVICE, 'cluster': FAKE_CLUSTER, 'desiredCount': FAKE_DESIRED_COUNT})
  })
});