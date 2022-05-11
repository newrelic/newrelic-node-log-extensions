/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')
const formatFactory = require('../../lib/createFormatter.js')
const sinon = require('sinon')

utils(tap)

tap.test('createFormatter edge cases', (t) => {
  t.autoend()

  let helper
  let winston
  let api

  t.beforeEach(() => {
    // loading winston first so agent does not instrument it
    winston = require('winston')
    helper = utils.TestAgent.makeInstrumented()
    api = {
      shim: {
        isWrapped: sinon.stub(),
        agent: helper.agent,
        logger: {
          warn: sinon.stub()
        }
      }
    }
  })

  t.afterEach(() => {
    helper.unload()
    winston = null
    api = null
    Object.keys(require.cache).forEach((key) => {
      if (/winston/.test(key)) {
        delete require.cache[key]
      }
    })
  })

  t.test('should respond with basic json formatter when newrelic.shim is undefined', (t) => {
    const formatter = formatFactory({}, winston)
    t.equal(formatter, winston.format.json)
    t.end()
  })

  t.test(
    'should respond with basic json formatter when winston.createLogger is already wrapped',
    (t) => {
      api.shim.isWrapped.returns(true)
      const formatter = formatFactory(api, winston)
      t.equal(formatter, winston.format.json)
      t.equal(
        api.shim.logger.warn.args[0][0],
        'winston is already instrumented. Disabling application logging and using package as log enricher.'
      )
      t.end()
    }
  )

  t.test('should disable application logging when winston.createLogger is already wrapped', (t) => {
    helper.agent.config.application_logging = {
      enabled: true
    }
    api.shim.isWrapped.returns(true)
    formatFactory(api, winston)
    t.equal(helper.agent.config.application_logging.enabled, false)
    t.end()
  })

  t.test(
    'should not disable application logging when winston.createLogger is already wrapped and application_logging config does not exist',
    (t) => {
      helper.agent.config.application_logging = undefined
      api.shim.isWrapped.returns(true)
      formatFactory(api, winston)
      t.equal(helper.agent.config.application_logging, undefined)
      t.end()
    }
  )

  t.test('should respond with a new formatter when winston.createLogger is not wrapped', (t) => {
    api.shim.isWrapped.returns(false)
    const formatter = formatFactory(api, winston)
    t.not(formatter, winston.format.json)
    t.ok(typeof formatter === 'function')
    t.end()
  })
})
