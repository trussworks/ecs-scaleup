const amazonEcrLogin = require('./amazonEcrLogin')
const configAwsCreds = require('./configAwsCreds')

async function cleanup() {
  await amazonEcrLogin()
  await configAwsCreds()
}

module.exports = cleanup;

if (require.main === module) {
    cleanup();
}
