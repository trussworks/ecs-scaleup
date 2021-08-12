const configAwsCreds = require('./configAwsCreds')
const amazonEcrLogin = require('./amazonEcrLogin')

async function run() {
  await configAwsCreds()
  await amazonEcrLogin()
}

module.exports = run;

if (require.main === module) {
    run();
}
