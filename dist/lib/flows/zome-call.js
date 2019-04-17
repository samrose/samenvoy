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
exports.default = (publicClient, internalClient) => (call) => __awaiter(this, void 0, void 0, function* () {
    // TODO: add replay attack protection? nonce?
    // TODO: figure out actual payload, especially after conductor RPC call is refactored
    const { agentId, happId, dnaHash, zome: zomeName, function: funcName, params, } = call;
    let signature = call.signature;
    console.debug("holo/call input: ", call);
    if (typeof signature !== 'string') {
        console.warn("hClient sent weird signature! TODO find out why");
        signature = 'TODO-look-into-hClient-signature';
    }
    const requestData = exports.buildServiceLoggerRequestPackage(call);
    const requestEntryHash = yield logServiceRequest(internalClient, { happId, agentId, dnaHash, requestData, zomeName, funcName, signature });
    const result = yield common_1.zomeCallByDna(publicClient, {
        agentId, dnaHash, zomeName, funcName, params
    });
    const responseData = exports.buildServiceLoggerResponsePackage(result);
    const metrics = exports.calcMetrics(requestData, responseData);
    const responseEntryHash = yield logServiceResponse(internalClient, { happId, requestEntryHash, responseData, metrics });
    return result;
});
const logServiceRequest = (client, payload) => __awaiter(this, void 0, void 0, function* () {
    const { happId, agentId, dnaHash, requestData, signature, zomeName, funcName } = payload;
    const instanceId = common_1.serviceLoggerInstanceIdFromHappId(happId);
    const hash = yield common_1.zomeCallByInstance(client, {
        instanceId: instanceId,
        zomeName: 'service',
        funcName: 'log_request',
        params: {
            entry: {
                agent_id: agentId,
                dna_hash: dnaHash,
                zome_call_spec: common_1.zomeCallSpec({ zomeName, funcName }),
                client_signature: signature,
            }
        }
    });
    return hash;
});
const logServiceResponse = (client, { happId, requestEntryHash, responseData, metrics }) => __awaiter(this, void 0, void 0, function* () {
    const instanceId = common_1.serviceLoggerInstanceIdFromHappId(happId);
    const hash = yield common_1.zomeCallByInstance(client, {
        instanceId: instanceId,
        zomeName: 'service',
        funcName: 'log_response',
        params: {
            entry: {
                request_hash: requestEntryHash,
                hosting_stats: metrics,
                response_log: 'TODO: response_log',
                response_data_hash: 'TODO: response_data_hash',
                host_signature: 'TODO: remove this and have servicelogger make signature internally',
            }
        }
    });
    return hash;
});
/**
 * Gets called as a separate request from the UI, after the response has been delivered
 */
exports.logServiceSignature = (client, { happId, responseEntryHash, signature }) => __awaiter(this, void 0, void 0, function* () {
    const instanceId = common_1.serviceLoggerInstanceIdFromHappId(happId);
    const hash = yield common_1.zomeCallByInstance(client, {
        instanceId: instanceId,
        zomeName: 'service',
        funcName: 'log_service',
        params: {
            entry: {
                response_hash: responseEntryHash,
                client_signature: signature
            }
        }
    });
    return null;
});
exports.buildServiceLoggerRequestPackage = ({ dnaHash, zome, function: func, params }) => {
    return {
        function: `${dnaHash}/${zome}/${func}`,
        params
    };
};
exports.buildServiceLoggerResponsePackage = (response) => {
    return response;
};
exports.calcMetrics = (request, response) => ({
    bytes_in: JSON.stringify(request).length,
    bytes_out: JSON.stringify(response).length,
    cpu_seconds: 0.1111111,
});
//# sourceMappingURL=zome-call.js.map