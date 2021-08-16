const configAwsCreds = require('./configAwsCreds')
const amazonEcrLogin = require('./amazonEcrLogin')
const getTaskDefinition = require('./getTaskDefinition')
const renderTaskDefinition = require('./renderTaskDefinition')

async function run() {
  await configAwsCreds()
  const imageUri = await amazonEcrLogin()
  const taskDef = await getTaskDefinition()
  const newTaskDef = await renderTaskDefinition(taskDef, imageUri)
  console.log(newTaskDef)
}

module.exports = run;

if (require.main === module) {
    run();
}
