import getDependencies from './getDependencies'
// import componentAxios from './requestProxy'

export default {
  pattern: /\/server\//,
  type: 'backend',
  getDependencies,
  // requestProxy: componentAxios,
}
