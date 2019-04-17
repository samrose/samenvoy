"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const os = require("os");
const nick_database_1 = require("./shims/nick-database");
const devUI = process.env.INTRCEPTR_UI || "";
if (devUI) {
    console.log("Using dev UI hash: ", devUI);
}
exports.defaultEnvoyHome = process.env.INTRCEPTR_PATH || path.join(os.homedir(), '.holochain/holo');
exports.conductorConfigPath = (dir) => path.join(dir || exports.defaultEnvoyHome, 'conductor-config.toml');
exports.uiStorageDir = (dir) => path.join(dir || exports.defaultEnvoyHome, 'ui-store', devUI);
exports.chainStorageDir = (dir) => path.join(dir || exports.defaultEnvoyHome, 'storage');
exports.testKeyDir = path.join(os.tmpdir(), 'holo-envoy', 'test-keydata');
exports.testKeybundlePath = path.join(exports.testKeyDir, 'keybundle.json');
exports.testAgentAddressPath = path.join(exports.testKeyDir, 'INTRCEPTR_AGENT_ADDRESS');
exports.testKeyPassphrase = ''; // TODO: can go away once `hc keygen --nullpass` fully works
exports.hostAgentName = 'host-agent';
exports.holoHostingAppId = {
    instance: 'holo-hosting-app',
    dna: 'holo-hosting-app',
};
exports.holofuelId = {
    instance: 'holofuel',
    dna: 'holofuel',
};
exports.keyConfigFile = 'src/shims/envoy-host-key.json';
var ConductorInterface;
(function (ConductorInterface) {
    ConductorInterface["Master"] = "master-interface";
    ConductorInterface["Public"] = "public-interface";
    ConductorInterface["Internal"] = "internal-interface";
})(ConductorInterface = exports.ConductorInterface || (exports.ConductorInterface = {}));
exports.DNAS = {
    serviceLogger: {
        path: 'src/dnas/servicelogger/dist/servicelogger.dna.json',
        hash: 'QmQVBMotvRcGD28kr3XJ7LvMfzEqpBfNi3DoCLP6wqr8As',
        nick: 'servicelogger'
    },
    holoHosting: {
        path: 'src/dnas/Holo-Hosting-App/dna-src/dist/dna-src.dna.json',
        hash: 'QmXuPFimMCoYQrXqX9vr1vve8JtpQ7smfkw1LugqEhyWTr',
        nick: 'holo-hosting-app'
    },
    holofuel: {
        path: 'src/dnas/holofuel/dist/holofuel.dna.json',
        hash: 'QmNzGsdcvMymfbToJSNb8891XMzfF6QJAgZKX5HvakDHAp',
        nick: 'holofuel'
    },
};
exports.PORTS = {
    // Actual server ports, visible outside of this machine
    external: 48080,
    admin: 9999,
    // These will eventually go away
    wormhole: 8888,
    shim: 5555,
    // Websocket ports, interfaces into the running conductor
    masterInterface: 1111,
    publicInterface: 2222,
    internalInterface: 3333,
};
exports.getNickByDna = dnaHash => {
    const coreApp = Object.values(exports.DNAS).find(entry => entry.hash === dnaHash);
    const externalApp = nick_database_1.nickDatabase.find(entry => Boolean(entry.knownDnaHashes.find(hash => hash === dnaHash)));
    return coreApp ? coreApp.nick : externalApp ? externalApp.nick : null;
};
//# sourceMappingURL=config.js.map