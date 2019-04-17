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
const axios_1 = require("axios");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const common_1 = require("../common");
const Config = require("../config");
const happ_server_1 = require("../shims/happ-server");
var ResourceType;
(function (ResourceType) {
    ResourceType[ResourceType["HappUi"] = 0] = "HappUi";
    ResourceType[ResourceType["HappDna"] = 1] = "HappDna";
})(ResourceType || (ResourceType = {}));
exports.default = (masterClient, baseDir) => ({ happId }) => __awaiter(this, void 0, void 0, function* () {
    const agentId = Config.hostAgentName;
    yield exports.installDnasAndUi(masterClient, baseDir, { happId });
    yield exports.setupInstances(masterClient, {
        happId,
        agentId,
        conductorInterface: Config.ConductorInterface.Public,
    });
    yield exports.setupServiceLogger(masterClient, { hostedHappId: happId });
});
exports.installDnasAndUi = (client, baseDir, opts) => __awaiter(this, void 0, void 0, function* () {
    // TODO: fetch data from somewhere, write fetched files to temp dir and extract
    // TODO: used cached version if possible
    const { happId, properties } = opts;
    console.log('Installing hApp ', happId);
    const { ui, dnas } = yield downloadAppResources(client, happId);
    console.log('  DNAs: ', dnas.map(dna => dna.path));
    if (ui) {
        console.log('  UI:   ', ui.path);
    }
    const dnaResults = yield Promise.all(dnas.map(dna => {
        return exports.installDna(client, {
            hash: dna.hash,
            path: dna.path,
            properties: undefined,
        });
    }));
    const results = [].concat(dnaResults);
    if (ui) {
        const uiResult = yield installUi(baseDir, { ui, happId });
        results.concat([uiResult]);
    }
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
        throw ({
            reason: 'hApp installation failed!',
            errors
        });
    }
    console.log("Installation successful!");
});
const installUi = (baseDir, { ui, happId }) => __awaiter(this, void 0, void 0, function* () {
    const target = path.join(Config.uiStorageDir(baseDir), happId);
    console.log("Installing UI (by copying from temp dir):", ui, target);
    yield fs.copy(ui.path, target);
    return { success: true };
});
const isDnaInstalled = (client, dnaId) => __awaiter(this, void 0, void 0, function* () {
    const installedDnas = yield common_1.callWhenConnected(client, 'admin/dna/list', {});
    // TODO: make sure the true DNA hash and ID really match here.
    // for now this is checking with ID since for testing I'm not using real DNA hashes
    return (installedDnas.find(({ id }) => id === dnaId));
});
exports.installDna = (client, { hash, path, properties }) => __awaiter(this, void 0, void 0, function* () {
    if (yield isDnaInstalled(client, hash)) {
        console.log(`DNA with ID ${hash} already installed; skipping.`);
        return { success: true };
    }
    else {
        return common_1.callWhenConnected(client, 'admin/dna/install_from_file', {
            id: hash,
            path: path,
            expected_hash: hash,
            copy: true,
            properties,
        });
    }
});
exports.setupInstance = (client, { instanceId, agentId, dnaId, conductorInterface }) => __awaiter(this, void 0, void 0, function* () {
    const instanceList = yield common_1.callWhenConnected(client, 'admin/instance/list', {});
    if (instanceList.find(({ id }) => id === instanceId)) {
        console.log(`Instance with ID ${instanceId} already set up; skipping.`);
        return { success: true };
    }
    // TODO handle case where instance exists
    const addInstance = yield common_1.callWhenConnected(client, 'admin/instance/add', {
        id: instanceId,
        agent_id: agentId,
        dna_id: dnaId,
    });
    const addToInterface = yield common_1.callWhenConnected(client, 'admin/interface/add_instance', {
        instance_id: instanceId,
        interface_id: conductorInterface,
    });
    const startInstance = yield common_1.callWhenConnected(client, 'admin/instance/start', {
        id: instanceId
    });
    return ([
        addInstance, addToInterface, startInstance
    ]);
});
exports.setupHolofuelBridge = (client, { callerInstanceId }) => __awaiter(this, void 0, void 0, function* () {
    return common_1.callWhenConnected(client, 'admin/bridge/add', {
        handle: 'holofuel-bridge',
        caller_id: callerInstanceId,
        callee_id: Config.holofuelId.instance,
    });
});
exports.setupInstances = (client, opts) => __awaiter(this, void 0, void 0, function* () {
    const { happId, agentId, conductorInterface } = opts;
    // NB: we don't actually use the UI info because we never install it into the conductor
    const { dnas, ui: _ } = yield exports.lookupHoloApp(client, { happId });
    const dnaPromises = dnas.map((dna) => __awaiter(this, void 0, void 0, function* () {
        const dnaId = dna.hash;
        const instanceId = common_1.instanceIdFromAgentAndDna(agentId, dnaId);
        return exports.setupInstance(client, {
            dnaId,
            agentId,
            instanceId,
            conductorInterface
        });
    }));
    const dnaResults = yield Promise.all(dnaPromises);
    // flatten everything out
    const results = [].concat(...dnaResults);
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
        throw ({
            reason: 'hApp instance setup failed!',
            errors
        });
    }
    console.log("Instance setup successful!");
});
exports.setupServiceLogger = (masterClient, { hostedHappId }) => __awaiter(this, void 0, void 0, function* () {
    const { hash, path } = Config.DNAS.serviceLogger;
    const instanceId = common_1.serviceLoggerInstanceIdFromHappId(hostedHappId);
    const agentId = Config.hostAgentName;
    const properties = {
        forApp: hostedHappId
    };
    yield exports.installDna(masterClient, { hash, path, properties });
    yield exports.setupInstance(masterClient, {
        instanceId,
        dnaId: hash,
        agentId,
        conductorInterface: Config.ConductorInterface.Internal
    });
    yield exports.setupHolofuelBridge(masterClient, { callerInstanceId: instanceId });
    // TODO: make initial call to serviceLogger to set up preferences?
});
exports.lookupHoloApp = (client, { happId }) => __awaiter(this, void 0, void 0, function* () {
    // this is a shim response for now
    // assuming DNAs are served as JSON packages
    // and UIs are served as ZIP archives
    // TODO: rewrite when using real App Store
    if (!(yield happIsRegistered(client, happId))) {
        throw `hApp is not registered by a provider! (happId = ${happId})`;
    }
    // TODO: look up actual web 2.0 hApp store via HTTP
    const happ = happ_server_1.shimHappById(happId);
    if (happ) {
        return happ;
    }
    else {
        throw `happId not found in shim database: ${happId}`;
    }
});
const happIsRegistered = (client, happId) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield common_1.zomeCallByInstance(client, {
            instanceId: Config.holoHostingAppId.instance,
            zomeName: 'provider',
            funcName: 'get_app_details',
            params: { app_hash: happId }
        });
        return true;
    }
    catch (e) {
        console.error("happIsRegistered returned error: ", e);
        console.error("This might be a real error or it could simply mean that the entry was not found. TODO: differentiate the two.");
        return false;
    }
});
exports.listHoloApps = () => {
    // TODO: call HHA's `get_my_registered_app` for real data
    const fakeApps = [].concat(happ_server_1.HAPP_DATABASE);
    for (const i in fakeApps) {
        fakeApps[i].ui_hash = fakeApps[i].ui;
        fakeApps[i].dna_list = fakeApps[i].dnas;
    }
    return Promise.resolve(fakeApps);
};
const downloadAppResources = (_client, happId) => __awaiter(this, void 0, void 0, function* () {
    const { dnas, ui } = yield exports.lookupHoloApp(_client, { happId });
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'happ-bundle-'));
    console.debug('using tempdir ', baseDir);
    let uiResource;
    if (ui) {
        console.debug("Downloading UI: ", ui);
        const uiTarPath = yield downloadResource(baseDir, ui, ResourceType.HappUi);
        const uiDir = yield unbundleUi(uiTarPath);
        uiResource = {
            hash: ui.hash,
            path: uiDir,
        };
    }
    const dnaResources = yield Promise.all(dnas.map((dna) => __awaiter(this, void 0, void 0, function* () {
        return ({
            hash: dna.hash,
            path: yield downloadResource(baseDir, dna, ResourceType.HappDna)
        });
    })));
    return { ui: uiResource, dnas: dnaResources };
});
const downloadResource = (baseDir, res, type) => __awaiter(this, void 0, void 0, function* () {
    const suffix = type === ResourceType.HappDna ? '.dna.json' : '.zip';
    const resourcePath = path.join(baseDir, res.hash + suffix);
    const response = yield axios_1.default.request({
        url: res.location,
        method: 'GET',
        responseType: 'stream',
        maxContentLength: 999999999999,
    }).catch(e => {
        console.warn('axios error: ', e);
        return e.response;
    });
    return new Promise((fulfill, reject) => {
        if (response.status != 200) {
            reject(`Could not fetch ${res.location}: ${response.statusText} ${response.status}`);
        }
        else {
            const writer = fs.createWriteStream(resourcePath)
                .on("finish", () => fulfill(resourcePath))
                .on("error", reject);
            console.debug("Starting streaming download...");
            response.data.pipe(writer);
        }
    });
});
const unbundleUi = (source) => __awaiter(this, void 0, void 0, function* () {
    const [target, end] = source.split('.zip');
    if (target == source) {
        throw "Could not unbundle UI. Check that the resource is a .zip file: " + source;
    }
    yield common_1.unbundleUI(source, target);
    return target;
});
/**
 * TODO: save payload of UI/DNA fetch from HCHC, for installing
 * @type {[type]}
 */
const saveTempFile = () => { };
//# sourceMappingURL=install-happ.js.map