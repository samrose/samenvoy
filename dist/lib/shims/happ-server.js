"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StaticServer = require("static-server");
const Config = require("../config");
exports.default = (shimPort) => {
    const shimServer = new StaticServer({
        rootPath: './src/shims/happ-data',
        port: shimPort
    });
    console.log('Shim server running on port', shimPort);
    shimServer.start();
    return shimServer;
};
exports.shimHappByNick = nick => exports.HAPP_DATABASE.find(a => a.nick === nick);
exports.shimHappById = happId => exports.HAPP_DATABASE.find(a => a.happId === happId);
exports.HAPP_DATABASE = [
    {
        happId: 'QmYcfBXfbFJSWfeNC32oEUL1bKsYvXRVN56me4Q9tNHUH7',
        nick: 'simple-app',
        dnas: [
            {
                location: `http://localhost:${Config.PORTS.shim}/simple-app/dist/simple-app.dna.json`,
                hash: 'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo'
            }
        ],
        ui: {
            location: 'src/shims/happ-data/simple-app/ui.zip',
            hash: 'QmSimpleAppFakeHash'
        },
    },
    {
        happId: 'QmXjsSgswP3Kknp2XVfmcsqFVdZ8mxva1gifYFmzNDv6EC',
        nick: 'basic-chat',
        dnas: [
            {
                location: `http://localhost:${Config.PORTS.shim}/holochain-basic-chat/dna-src/dist/dna-src.dna.json`,
                hash: 'QmbPqQJzvWR3sT4ixHqB4cJ6v96Fy3zGNY5svpXnpBHLm6'
            }
        ],
        ui: {
            location: `http://localhost:${Config.PORTS.shim}/holochain-basic-chat/ui.zip`,
            hash: 'QmBasicChatFakeHash'
        },
    },
    // The following are for testing only
    {
        happId: 'test-app-1',
        nick: 'test-app-1',
        dnas: [
            { location: 'nowhere', hash: 'test-dna-hash-1a' },
        ],
        ui: { location: 'nowhere.zip', hash: 'test-ui-hash-1' }
    },
    {
        happId: 'test-app-3',
        nick: 'test-app-3',
        dnas: [
            { location: 'nowhere', hash: 'test-dna-hash-3a' },
            { location: 'nowhere', hash: 'test-dna-hash-3b' },
            { location: 'nowhere', hash: 'test-dna-hash-3c' },
        ],
        ui: { location: 'nowhere.zip', hash: 'test-ui-hash-3' }
    }
];
//# sourceMappingURL=happ-server.js.map