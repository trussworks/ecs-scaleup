const configAwsCreds = require('./configAwsCreds')

async function cleanup() {
  await configAwsCreds()
}

module.exports = cleanup;

if (require.main === module) {
    cleanup();
}
