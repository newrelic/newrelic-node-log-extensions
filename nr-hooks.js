'use strict'

module.exports = [{
  type: 'generic',
  moduleName: 'winston',
  onRequire: require('./lib/instrumentation')
}]
