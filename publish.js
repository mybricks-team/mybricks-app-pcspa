const shelljs = require("shelljs");
const pkgJson = require("./package.json");
const fs = require("fs");
const args = process.argv.slice(2);
const isOffline = !!args.find((a) => a === "offline");
const noServiceUpdate = !!args.find((a) => a === "--noServiceUpdate");

const publishReactAppOffline = (callback) => {
  const buildCommand = `cd pages && npm run build:react-offline`;
  shelljs.exec(buildCommand, () => {
    const syncCommand = `node sync_offline.js react`;
    shelljs.exec(syncCommand, callback);
  });
};

const publishVue2AppOffline = (callback) => {
  const buildCommand = `cd pages && npm run build:vue2-offline`;
  shelljs.exec(buildCommand, () => {
    const syncCommand = `node sync_offline.js vue2`;
    shelljs.exec(syncCommand, callback);
  });
};

const publishReactAppOnline = (callback) => {
  const buildCommand = `cd pages && npm run build:react`;
  shelljs.exec(buildCommand, () => {
    const syncCommand = `npm publish --registry=https://registry.npmjs.org && node sync.js --origin=https://my.mybricks.world react ${
      noServiceUpdate ? "--noServiceUpdate" : ""
    }`;
    shelljs.exec(syncCommand, callback);
  });
};

const publishVue2AppOnline = (callback) => {
  const buildCommand = `cd pages && npm run build:vue2`;
  shelljs.exec(buildCommand, () => {
    const syncCommand = `npm publish --registry=https://registry.npmjs.org && node sync.js --origin=https://my.mybricks.world vue2 ${
      noServiceUpdate ? "--noServiceUpdate" : ""
    }`;
    shelljs.exec(syncCommand, callback);
  });
};

const fixAppInfo = () => {
  const json = { ...pkgJson };
  json.name = json.appConfig.vue2.name;
  json.mybricks = { ...json.mybricks, ...json.appConfig.vue2.mybricks };
  fs.writeFileSync("./package.json", JSON.stringify(json, null, 2));
};

const resetPkg = () => {
  fs.writeFileSync("./package.json", JSON.stringify(pkgJson, null, 2));
};

if (isOffline) {
  publishReactAppOffline(function () {
    fixAppInfo();
    publishVue2AppOffline(resetPkg);
  });
} else {
  publishReactAppOnline(function () {
    fixAppInfo();
    publishVue2AppOnline(resetPkg);
  });
}
