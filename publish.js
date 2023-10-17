const shelljs = require("shelljs");
const isOffline = !!process.argv[2];

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
    const syncCommand = `npm publish --registry=https://registry.npmjs.org && node sync.js --origin=https://my.mybricks.world react`;
    shelljs.exec(syncCommand, callback);
  });
};

const publishVue2AppOnline = (callback) => {
  const buildCommand = `cd pages && npm run build:vue2`;
  shelljs.exec(buildCommand, () => {
    const syncCommand = `npm publish --registry=https://registry.npmjs.org && node sync.js --origin=https://my.mybricks.world vue2`;
    shelljs.exec(syncCommand, callback);
  });
};

if (isOffline) {
  publishReactAppOffline(publishVue2AppOffline);
} else {
  publishReactAppOnline(publishVue2AppOnline);
}
