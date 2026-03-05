const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber');
const mockServer = require('../mock-server/server');

const MOCK_PORT = process.env.MOCK_PORT || 3000;

BeforeAll(async function () {
    await mockServer.start(MOCK_PORT);
    console.log('\n========================================');
    console.log('[SUITE] Starting Cucumber Test Suite');
    console.log('[SUITE] Mock server on port ' + MOCK_PORT);
    console.log('========================================\n');
});

Before(async function (scenario) {
    this.scenarioName = scenario.pickle.name;
    this.startTime = Date.now();
    console.log('\n[SCENARIO] ' + scenario.pickle.name);
});

After(async function (scenario) {
    var duration = Date.now() - this.startTime;
    var status = scenario.result.status;
    console.log('[' + status + '] ' + this.scenarioName + ' (' + duration + 'ms)');

    if (status === Status.FAILED) {
        console.log('[ERROR] ' + scenario.result.message);
    }
});

AfterAll(async function () {
    await mockServer.stop();
    console.log('\n========================================');
    console.log('[SUITE] Test Suite Complete');
    console.log('========================================\n');
});
