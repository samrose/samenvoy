"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const config_1 = require("../config");
const Config = require("../config");
const install_happ_1 = require("./install-happ");
exports.default = (masterClient) => ({ agentId, happId, signature, }) => __awaiter(this, void 0, void 0, function* () {
    const enabledApps = yield common_1.zomeCallByInstance(masterClient, {
        instanceId: Config.holoHostingAppId.instance,
        zomeName: 'host',
        funcName: 'get_enabled_app',
        params: {}
    });
    if (enabledApps.find(app => app.address === happId)) {
        yield exports.createAgent(masterClient, agentId);
        yield install_happ_1.setupInstances(masterClient, { happId, agentId, conductorInterface: config_1.ConductorInterface.Public });
    }
    else {
        throw `App is not enabled for hosting: '${happId}'`;
    }
});
exports.createAgent = (masterClient, agentId) => __awaiter(this, void 0, void 0, function* () {
    // TODO: pick different id / name, or leave as agent public address?
    // TODO: deal with it if agent already exists (due to being hosted by another app)
    const agents = yield common_1.callWhenConnected(masterClient, 'admin/agent/list', {});
    if (agents.find(agent => agent.id === agentId)) {
        console.warn(`Agent ${agentId} already exists, skipping...`);
    }
    else {
        yield common_1.callWhenConnected(masterClient, 'admin/agent/add', {
            id: agentId,
            name: agentId,
            public_address: agentId,
            keystore_file: 'IGNORED',
            holo_remote_key: agentId,
        });
    }
});
//# sourceMappingURL=new-agent.js.map