"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const C = require("../config");
const common_1 = require("../common");
exports.enableHapp = (client, happId) => {
    return common_1.zomeCallByInstance(client, {
        instanceId: C.holoHostingAppId.instance,
        zomeName: 'host',
        funcName: 'enable_app',
        params: {
            app_hash: happId
        }
    });
};
exports.disableHapp = (client, happId) => {
    return common_1.zomeCallByInstance(client, {
        instanceId: C.holoHostingAppId.instance,
        zomeName: 'host',
        funcName: 'disable_app',
        params: {
            app_hash: happId
        }
    });
};
exports.registerAsHost = (client) => {
    return common_1.zomeCallByInstance(client, {
        instanceId: C.holoHostingAppId.instance,
        zomeName: 'host',
        funcName: 'register_as_host',
        params: {
            host_doc: {
                kyc_proof: "TODO this proves nothing",
            }
        }
    });
};
exports.SHIMS = {
    registerAsProvider: (client) => {
        return common_1.zomeCallByInstance(client, {
            instanceId: C.holoHostingAppId.instance,
            zomeName: 'provider',
            funcName: 'register_as_provider',
            params: {
                provider_doc: {
                    kyc_proof: "TODO this proves nothing",
                }
            }
        });
    },
    registerHapp: (client, { uiHash, dnaHashes }) => {
        return common_1.zomeCallByInstance(client, {
            instanceId: C.holoHostingAppId.instance,
            zomeName: 'provider',
            funcName: 'register_app',
            params: {
                ui_hash: uiHash || "",
                dna_list: dnaHashes,
            }
        });
    }
};
//# sourceMappingURL=holo-hosting.js.map