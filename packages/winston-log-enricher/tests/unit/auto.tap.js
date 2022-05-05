/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')
const formatFactory = require('../../lib/createFormatter.js')
const API = require('newrelic/api')

utils(tap)

tap.test('auto-instrumentation of winston', { bail: true }, (t) => {
  t.autoend()

  let helper
  let winston
  let api

  t.afterEach(() => {
    Object.keys(require.cache).forEach((key) => {
      if (/winston/.test(key)) {
        delete require.cache[key]
      }
    })
  })

  t.test('when auto-instrumentation occurs', (t) => {
    t.autoend()

    t.beforeEach(() => {
      helper = utils.TestAgent.makeInstrumented()
      winston = require('winston')
      api = new API(helper.agent)
      winston.createLogger.__NR_original = true
    })

    t.afterEach(() => {
      helper.unload()
      winston = null
      api = null
    })

    t.test(
      'formatter factory should respond with basic json formatter because winston is already instrumented',
      (t) => {
        t.autoend()
        const formatter = formatFactory(api, winston)
        t.equal(formatter, winston.format.json)
      }
    )
  })

  t.test('when auto-instrumentation does not occur', (t) => {
    t.autoend()

    t.beforeEach(() => {
      helper = utils.TestAgent.makeInstrumented()
      winston = require('winston')
      api = new API(helper.agent)
    })

    t.afterEach(() => {
      helper.unload()
      winston = null
      api = null
    })

    t.test('should not have instrumented winston automatically', (t) => {
      t.autoend()
      t.not(api.shim.isWrapped(winston.createLogger))
    })

    t.test(
      'formatter factory should not respond with a basic json formatter because winston is not instrumented',
      (t) => {
        t.autoend()
        const formatter = formatFactory(api, winston)
        t.not(formatter, winston.format.json)
      }
    )
  })
})
