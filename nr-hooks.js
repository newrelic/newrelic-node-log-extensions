'use strict'

module.exports = [{
  type: 'generic',
  moduleName: 'logform/json',
  onRequire: require('./lib/instrumentation')
}]
