const run = require('./deployTaskDefinition');
const core = require('@actions/core');

jest.mock('@actions/core');

const mockEcsRegisterTaskDef = jest.fn();
const mockEcsUpdateService = jest.fn();
const mockEcsDescribeServices = jest.fn();
const mockEcsWaiter = jest.fn();
const mockCodeDeployCreateDeployment = jest.fn();
const mockCodeDeployGetDeploymentGroup = jest.fn();
const mockCodeDeployWaiter = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        config: {
            region: 'fake-region'
        },
        ECS: jest.fn(() => ({
            registerTaskDefinition: mockEcsRegisterTaskDef,
            updateService: mockEcsUpdateService,
            describeServices: mockEcsDescribeServices,
            waitFor: mockEcsWaiter
        })),
        CodeDeploy: jest.fn(() => ({
            createDeployment: mockCodeDeployCreateDeployment,
            getDeploymentGroup: mockCodeDeployGetDeploymentGroup,
            waitFor: mockCodeDeployWaiter
        }))
    };
});

const EXPECTED_DEFAULT_WAIT_TIME = 30;
const EXPECTED_CODE_DEPLOY_DEPLOYMENT_READY_WAIT_TIME = 60;
const EXPECTED_CODE_DEPLOY_TERMINATION_WAIT_TIME = 30;

// ADD A FAKE TASK DEFINITION HERE to pass to the run function
const FAKE_TASK_DEFINITION = JSON.stringify({ family: 'task-def-family' });

describe('Deploy to ECS', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('service-456')         // service
            .mockReturnValueOnce('cluster-789');        // cluster

        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });

        mockEcsRegisterTaskDef.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({ taskDefinition: { taskDefinitionArn: 'task:def:arn' } });
                }
            };
        });

        mockEcsUpdateService.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        mockEcsDescribeServices.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({
                        failures: [],
                        services: [{
                            status: 'ACTIVE'
                        }]
                    });
                }
            };
        });

        mockEcsWaiter.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        mockCodeDeployCreateDeployment.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({ deploymentId: 'deployment-1' });
                }
            };
        });

        mockCodeDeployGetDeploymentGroup.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({
                        deploymentGroupInfo: {
                            blueGreenDeploymentConfiguration: {
                                deploymentReadyOption: {
                                    waitTimeInMinutes: EXPECTED_CODE_DEPLOY_DEPLOYMENT_READY_WAIT_TIME
                                },
                                terminateBlueInstancesOnDeploymentSuccess: {
                                    terminationWaitTimeInMinutes: EXPECTED_CODE_DEPLOY_TERMINATION_WAIT_TIME
                                }
                            }
                        }
                    });
                }
            };
        });

        mockCodeDeployWaiter.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });
    });

     test('registers the task definition contents and updates the service', async () => {
        await run(FAKE_TASK_DEFINITION);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition-arn', 'task:def:arn');
        expect(mockEcsDescribeServices).toHaveBeenNthCalledWith(1, {
            cluster: 'cluster-789',
            services: ['service-456']
        });
        expect(mockEcsUpdateService).toHaveBeenNthCalledWith(1, {
            cluster: 'cluster-789',
            service: 'service-456',
            taskDefinition: 'task:def:arn',
            forceNewDeployment: false
        });
        expect(mockEcsWaiter).toHaveBeenCalledTimes(1);
        expect(core.info).toBeCalledWith("Deployment started. Watch this deployment's progress in the Amazon ECS console: https://console.aws.amazon.com/ecs/home?region=fake-region#/clusters/cluster-789/services/service-456/events");
    });

    test('cleans null keys out of the task definition contents', async () => {
        const taskDef = '{ "ipcMode": null, "family": "task-def-family" }';
        await run(taskDef);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
    });

    test('cleans empty arrays out of the task definition contents', async () => {
        const taskDef = '{ "tags": [], "family": "task-def-family" }';
        await run(taskDef);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
    });

    test('cleans empty strings and objects out of the task definition contents', async () => {
        const taskDef = `
        {
            "memory": "",
            "containerDefinitions": [ {
                "name": "sample-container",
                "logConfiguration": {},
                "repositoryCredentials": { "credentialsParameter": "" },
                "command": [
                    ""
                ],
                "environment": [
                    {
                        "name": "hello",
                        "value": "world"
                    },
                    {
                        "name": "test",
                        "value": ""
                    },
                    {
                        "name": "",
                        "value": ""
                    }
                ],
                "secretOptions": [ {
                    "name": "",
                    "valueFrom": ""
                } ],
                "cpu": 0,
                "essential": false
            } ],
            "requiresCompatibilities": [ "EC2" ],
            "registeredAt": 1611690781,
            "family": "task-def-family"
        }
        `;

        await run(taskDef);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: 'sample-container',
                    cpu: 0,
                    essential: false,
                    environment: [{
                        name: 'hello',
                        value: 'world'
                    }, {
                        "name": "test",
                        "value": ""
                    }]
                }
            ],
            requiresCompatibilities: [ 'EC2' ]
        });
    });

    test('maintains empty keys in proxyConfiguration.properties for APPMESH', async () => {
        const taskDef = `
        {
            "memory": "",
            "containerDefinitions": [ {
                "name": "sample-container",
                "logConfiguration": {},
                "repositoryCredentials": { "credentialsParameter": "" },
                "command": [
                    ""
                ],
                "environment": [
                    {
                        "name": "hello",
                        "value": "world"
                    },
                    {
                        "name": "",
                        "value": ""
                    }
                ],
                "secretOptions": [ {
                    "name": "",
                    "valueFrom": ""
                } ],
                "cpu": 0,
                "essential": false
            } ],
            "requiresCompatibilities": [ "EC2" ],
            "registeredAt": 1611690781,
            "family": "task-def-family",
            "proxyConfiguration": {
                "type": "APPMESH",
                "containerName": "envoy",
                "properties": [
                    {
                        "name": "ProxyIngressPort",
                        "value": "15000"
                    },
                    {
                        "name": "AppPorts",
                        "value": "1234"
                    },
                    {
                        "name": "EgressIgnoredIPs",
                        "value": "169.254.170.2,169.254.169.254"
                    },
                    {
                        "name": "IgnoredGID",
                        "value": ""
                    },
                    {
                        "name": "EgressIgnoredPorts",
                        "value": ""
                    },
                    {
                        "name": "IgnoredUID",
                        "value": "1337"
                    },
                    {
                        "name": "ProxyEgressPort",
                        "value": "15001"
                    },
                    {
                        "value": "some-value"
                    }
                ]
            }
        }
        `;

        await run(taskDef);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: 'sample-container',
                    cpu: 0,
                    essential: false,
                    environment: [{
                        name: 'hello',
                        value: 'world'
                    }]
                }
            ],
            requiresCompatibilities: [ 'EC2' ],
            proxyConfiguration: {
                type: "APPMESH",
                containerName: "envoy",
                properties: [
                    {
                        name: "ProxyIngressPort",
                        value: "15000"
                    },
                    {
                        name: "AppPorts",
                        value: "1234"
                    },
                    {
                        name: "EgressIgnoredIPs",
                        value: "169.254.170.2,169.254.169.254"
                    },
                    {
                        name: "IgnoredGID",
                        value: ""
                    },
                    {
                        name: "EgressIgnoredPorts",
                        value: ""
                    },
                    {
                        name: "IgnoredUID",
                        value: "1337"
                    },
                    {
                        name: "ProxyEgressPort",
                        value: "15001"
                    },
                    {
                        name: "",
                        value: "some-value"
                    }
                ]
            }
        });
    });

    test('cleans invalid keys out of the task definition contents', async () => {
        const taskDef = '{ "compatibilities": ["EC2"], "taskDefinitionArn": "arn:aws...:task-def-family:1", "family": "task-def-family", "revision": 1, "status": "ACTIVE" }';
        await run(taskDef);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
    });

   test('waits for the service to be stable', async () => {
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('service-456')         // service
            .mockReturnValueOnce('cluster-789')         // cluster

        await run(FAKE_TASK_DEFINITION);
        expect(core.setFailed).toHaveBeenCalledTimes(0);

        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition-arn', 'task:def:arn');
        expect(mockEcsDescribeServices).toHaveBeenNthCalledWith(1, {
            cluster: 'cluster-789',
            services: ['service-456']
        });
        expect(mockEcsUpdateService).toHaveBeenNthCalledWith(1, {
            cluster: 'cluster-789',
            service: 'service-456',
            taskDefinition: 'task:def:arn',
            forceNewDeployment: false
        });
        expect(mockEcsWaiter).toHaveBeenNthCalledWith(1, 'servicesStable', {
            services: ['service-456'],
            cluster: 'cluster-789',
            "$waiter": {
                "delay": 15,
                "maxAttempts": EXPECTED_DEFAULT_WAIT_TIME * 4,
            },
        });
    });

//     test('waits for the service to be stable for max 6 hours', async () => {
//         core.getInput = jest
//             .fn()
//             .mockReturnValueOnce('task-definition.json') // task-definition
//             .mockReturnValueOnce('service-456')         // service
//             .mockReturnValueOnce('cluster-789')         // cluster
//             .mockReturnValueOnce('TRUE')                // wait-for-service-stability
//             .mockReturnValueOnce('1000');                   // wait-for-minutes

//         await run();
//         expect(core.setFailed).toHaveBeenCalledTimes(0);

//         expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
//         expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition-arn', 'task:def:arn');
//         expect(mockEcsDescribeServices).toHaveBeenNthCalledWith(1, {
//             cluster: 'cluster-789',
//             services: ['service-456']
//         });
//         expect(mockEcsUpdateService).toHaveBeenNthCalledWith(1, {
//             cluster: 'cluster-789',
//             service: 'service-456',
//             taskDefinition: 'task:def:arn',
//             forceNewDeployment: false
//         });
//         expect(mockEcsWaiter).toHaveBeenNthCalledWith(1, 'servicesStable', {
//             services: ['service-456'],
//             cluster: 'cluster-789',
//             "$waiter": {
//                 "delay": 15,
//                 "maxAttempts": 6 * 60 * 4,
//             },
//         });
//     });

//     test('force new deployment', async () => {
//         core.getInput = jest
//             .fn()
//             .mockReturnValueOnce('task-definition.json')  // task-definition
//             .mockReturnValueOnce('service-456')          // service
//             .mockReturnValueOnce('cluster-789')          // cluster
//             .mockReturnValueOnce('false')                // wait-for-service-stability
//             .mockReturnValueOnce('')                     // wait-for-minutes
//             .mockReturnValueOnce('true');                  // force-new-deployment

//         await run();
//         expect(core.setFailed).toHaveBeenCalledTimes(0);

//         expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
//         expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition-arn', 'task:def:arn');
//         expect(mockEcsDescribeServices).toHaveBeenNthCalledWith(1, {
//             cluster: 'cluster-789',
//             services: ['service-456']
//         });
//         expect(mockEcsUpdateService).toHaveBeenNthCalledWith(1, {
//             cluster: 'cluster-789',
//             service: 'service-456',
//             taskDefinition: 'task:def:arn',
//             forceNewDeployment: true
//         });
//     });

    test('defaults to the default cluster', async () => {
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('service-456');         // service

        await run(FAKE_TASK_DEFINITION);
        expect(core.setFailed).toHaveBeenCalledTimes(0);

        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition-arn', 'task:def:arn');
        expect(mockEcsDescribeServices).toHaveBeenNthCalledWith(1, {
            cluster: 'default',
            services: ['service-456']
        });
        expect(mockEcsUpdateService).toHaveBeenNthCalledWith(1, {
            cluster: 'default',
            service: 'service-456',
            taskDefinition: 'task:def:arn',
            forceNewDeployment: false
        });
    });

    test('does not update service if none specified', async () => {
        core.getInput = jest
            .fn()

        await run(FAKE_TASK_DEFINITION);
        expect(core.setFailed).toHaveBeenCalledTimes(0);

        expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, { family: 'task-def-family'});
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition-arn', 'task:def:arn');
        expect(mockEcsDescribeServices).toHaveBeenCalledTimes(0);
        expect(mockEcsUpdateService).toHaveBeenCalledTimes(0);
    });

    test('error is caught if service does not exist', async () => {
        mockEcsDescribeServices.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({
                        failures: [{
                            reason: 'MISSING',
                            arn: 'hello'
                        }],
                        services: []
                    });
                }
            };
        });

        await run(FAKE_TASK_DEFINITION);

        expect(core.setFailed).toBeCalledWith('hello is MISSING');
    });

    test('error is caught if service is inactive', async () => {
        mockEcsDescribeServices.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({
                        failures: [],
                        services: [{
                            status: 'INACTIVE'
                        }]
                    });
                }
            };
        });

        await run(FAKE_TASK_DEFINITION);

        expect(core.setFailed).toBeCalledWith('Service is INACTIVE');
    });

    test('error is caught if task def registration fails', async () => {
        mockEcsRegisterTaskDef.mockImplementation(() => {
            throw new Error("Could not parse");
        });

        await run(FAKE_TASK_DEFINITION);

        expect(core.setFailed).toHaveBeenCalledTimes(2);
        expect(core.setFailed).toHaveBeenNthCalledWith(1, 'Failed to register task definition in ECS: Could not parse');
        expect(core.setFailed).toHaveBeenNthCalledWith(2, 'Could not parse');
    });
 });