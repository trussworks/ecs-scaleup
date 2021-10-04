const configAwsCreds = require('./configAwsCreds')
const getTaskDefinition = require('./getTaskDefinition')
const incrementServiceCount = require('./incrementServiceCount')
const deployTaskDefinition = require('./deployTaskDefinition')

async function run() {
  await configAwsCreds()
  const taskDef = await getTaskDefinition()
  await incrementServiceCount()
  await deployTaskDefinition(taskDef)
}

module.exports = run;

if (require.main === module) {
    run();
}
