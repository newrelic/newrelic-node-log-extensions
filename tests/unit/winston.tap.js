'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')

tap.test('Winston instrumentation', (t) => {
  const helper = utils.TestAgent.makeInstrumented()
  t.tearDown(() => helper.unload())

  helper.registerInstrumentation({
    moduleName: 'logform/json',
    type: 'generic',
    onRequire: require('../../lib/instrumentation'),
  })
  const winston = require('winston')

  t.ok(winston.format.json, 'should not remove the json format')
  t.type(winston.format.json, 'function')
  t.end()
})
