const configAwsCreds = require('./configAwsCreds')
const amazonEcrLogin = require('./amazonEcrLogin')
const getTaskDefinition = require('./getTaskDefinition')
const renderTaskDefinition = require('./renderTaskDefinition')
const incrementServiceCount = require('./incrementServiceCount')

async function run() {
  await configAwsCreds()
  const imageUri = await amazonEcrLogin()
  const taskDef = await getTaskDefinition()
  const newTaskDef = await renderTaskDefinition(taskDef, imageUri)
  await incrementServiceCount()
}

module.exports = run;

if (require.main === module) {
    run();
}
