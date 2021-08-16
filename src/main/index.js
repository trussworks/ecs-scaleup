const configAwsCreds = require('./configAwsCreds')
const amazonEcrLogin = require('./amazonEcrLogin')
const getTaskDefinition = require('./getTaskDefinition')
const renderTaskDefinition = require('./renderTaskDefinition')

async function run() {
  await configAwsCreds()
  await amazonEcrLogin()
  await getTaskDefinition()
}

module.exports = run;

if (require.main === module) {
    run();
}
