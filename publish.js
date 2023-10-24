const shelljs = require("shelljs");
const pkgJson = require("./package.json");
const fs = require("fs");
const args = process.argv.slice(2);
const isOffline = !!args.find((a) => a === "offline");
const noServiceUpdate = !!args.find((a) => a === "--noServiceUpdate");

const publishReactAppOffline = () => {
  return new Promise((resolve) => {
    const buildCommand = `cd pages && npm run build:react-offline`;
    shelljs.exec(buildCommand, () => {
      const syncCommand = `node sync_offline.js react`;
      shelljs.exec(syncCommand, resolve);
    });
  })
};

const publishVue2AppOffline = () => {
  return new Promise((resolve) => {
    const buildCommand = `cd pages && npm run build:vue2-offline`;
    shelljs.exec(buildCommand, () => {
      const syncCommand = `node sync_offline.js vue2`;
      shelljs.exec(syncCommand, resolve);
    });
  })
};

const publishReactAppOnline = () => {
  return new Promise((resolve) => {
    const buildCommand = `cd pages && npm run build:react`;
    shelljs.exec(buildCommand, () => {
      const syncCommand = `npm publish --registry=https://registry.npmjs.org && node sync.js --origin=https://my.mybricks.world --appType=react ${noServiceUpdate ? "--noServiceUpdate" : ""
        }`;
      shelljs.exec(syncCommand, resolve);
    });
  })
};

const publishVue2AppOnline = () => {
  return new Promise((resolve) => {
    const buildCommand = `cd pages && npm run build:vue2`;
    shelljs.exec(buildCommand, () => {
      const syncCommand = `npm publish --registry=https://registry.npmjs.org && node sync.js --origin=https://my.mybricks.world --appType=vue2 ${noServiceUpdate ? "--noServiceUpdate" : ""
        }`;
      shelljs.exec(syncCommand, resolve);
    });
  })
};

const fixPkg = () => {
  return new Promise((resolve) => {
    const json = { ...pkgJson };
    json.name = json.appConfig.vue2.name;
    json.mybricks = { ...json.mybricks, ...json.appConfig.vue2.mybricks };
    fs.writeFileSync("./package.json", JSON.stringify(json, null, 2));
    resolve()
  })
};

const resetPkg = () => {
  fs.writeFileSync("./package.json", JSON.stringify(pkgJson, null, 2));
};

const execChain = (fns) => {
  fns.reduce((chain, fn) => chain.then(fn), Promise.resolve())
}

if (isOffline) {
  execChain([
    publishReactAppOffline, 
    // fixPkg, 
    // publishVue2AppOffline, 
    // resetPkg
  ])
} else {
  execChain([
    publishReactAppOnline, 
    // fixPkg, 
    // publishVue2AppOnline, 
    // resetPkg
  ])
}


