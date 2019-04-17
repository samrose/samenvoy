"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const child_process_1 = require("child_process");
const common_1 = require("../common");
const happs = [
    {
        dnas: ['./src/dnas/servicelogger/']
    },
    {
        dnas: ['./src/dnas/holofuel/']
    },
    {
        dnas: ['./src/dnas/Holo-Hosting-App/dna-src/']
    },
    // {
    //   dnas: ['./src/shims/happ-data/simple-app/'],
    //   ui: './src/shims/happ-data/simple-app/ui'
    // },
    {
        dnas: ['./src/shims/happ-data/holochain-basic-chat/dna-src/'],
        ui: './src/shims/happ-data/holochain-basic-chat/ui'
    },
];
const uiBundlePromises = [];
happs.forEach(happ => {
    if (happ.ui) {
        const zipPath = path.join(happ.ui, '..', 'ui.zip');
        try {
            fs.unlinkSync(zipPath);
        }
        catch (_a) {
            console.warn(`No ${zipPath}, skipping...`);
        }
        console.log(`Bundling UI for ${happ.ui} ...`);
        const promise = common_1.bundleUI(happ.ui, zipPath);
        uiBundlePromises.push(promise);
    }
    happ.dnas.forEach(dir => {
        console.log(`Packaging DNA for '${dir}'...`);
        child_process_1.execSync(`find $dir -name Cargo.lock -delete`);
        child_process_1.execSync(`cd ${dir} && hc package --strip-meta`);
    });
});
Promise.all(uiBundlePromises).then((results) => {
    console.log('All done!');
    if (results.length) {
        console.log('UI bundles: ', results);
    }
});
//# sourceMappingURL=build.js.map