/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')
const formatFactory = require('../../lib/createFormatter')
const { sink, once } = require('pino/test/helper')
const API = require('newrelic/api')
const truncate = require('../../lib/truncate')

tap.Test.prototype.addAssert(
  'validateAnnotations',
  2,
  function assertCoreAnnotations(logLine, config) {
    this.equal(
      logLine['entity.name'],
      config.applications()[0],
      'should have entity name that matches app'
    )
    this.equal(logLine['entity.type'], 'SERVICE', 'should have entity type of SERVICE')
    this.equal(logLine.hostname, config.getHostnameSafe(), 'should have proper hostname')
    this.match(logLine.timestamp, /[0-9]{10}/, 'should have proper unix timestamp')
  }
)

tap.test('Pino instrumentation', (t) => {
  t.autoend()
  let logger
  let config
  let pinoConfig
  let helper
  let stream
  let api
  let pino

  t.beforeEach(() => {
    helper = utils.TestAgent.makeInstrumented()
    helper.agent.config.application_logging = { metrics: { enabled: true } }
    pino = require('pino')
    api = new API(helper.agent)
    stream = sink()
    pinoConfig = formatFactory(api)
    pinoConfig.level = 'debug'
    logger = pino(pinoConfig, stream)
    config = helper.agent.config
  })

  t.afterEach(() => {
    helper.unload()
  })

  t.test('should have proper metadata outside of a transaction', async (t) => {
    const message = 'pino unit test'
    logger.info(message)
    const line = await once(stream, 'data')
    t.validateAnnotations(line, config)
    t.equal(line.message, message, 'should have proper message key/value')
    t.end()
  })

  t.test('should have proper error keys when error is present', async (t) => {
    const err = new Error('This is a test')
    logger.error(err)
    const line = await once(stream, 'data')
    t.validateAnnotations(line, config)
    t.equal(line['error.class'], 'Error', 'should have Error as error.class')
    t.equal(line['error.message'], err.message, 'should have proper error.message')
    t.equal(line['error.stack'], truncate(err.stack), 'should have proper error.stack')
    t.notOk(line.err, 'should not have err key')
    t.equal(line.message, err.message, 'should have proper messsage')
    t.end()
  })

  t.test('should add proper trace info in transaction', (t) => {
    helper.runInTransaction('pino-test', async () => {
      logger.info('My debug test')
      const meta = api.getLinkingMetadata()
      const line = await once(stream, 'data')
      t.validateAnnotations(line, config)
      t.equal(line['trace.id'], meta['trace.id'])
      t.equal(line['span.id'], meta['span.id'])
      t.end()
    })
  })

  t.test('should still log user data when agent is disabled', async (t) => {
    const disabledLogger = pino(formatFactory({}), stream)
    const message = 'logs are not enriched'
    disabledLogger.info(message)
    const line = await once(stream, 'data')
    t.equal(line.msg, message)
    t.match(line.time, /[0-9]{10}/)
    t.notOk(line['entity.type'])
    t.end()
  })

  t.test('should count logger metrics', (t) => {
    helper.runInTransaction('pino-test', async () => {
      const logLevels = {
        debug: 20,
        info: 5,
        warn: 3,
        error: 2
      }
      for (const [logLevel, maxCount] of Object.entries(logLevels)) {
        for (let count = 0; count < maxCount; count++) {
          const msg = `This is log message #${count} at ${logLevel} level`
          logger[logLevel](msg)
        }
      }
      await once(stream, 'data')

      let grandTotal = 0
      for (const [logLevel, maxCount] of Object.entries(logLevels)) {
        grandTotal += maxCount
        const metricName = `Logging/lines/${logLevel}`
        const metric = helper.agent.metrics.getMetric(metricName)
        t.ok(metric, `ensure ${metricName} exists`)
        t.equal(metric.callCount, maxCount, `ensure ${metricName} has the right value`)
      }
      const metricName = `Logging/lines`
      const metric = helper.agent.metrics.getMetric(metricName)
      t.ok(metric, `ensure ${metricName} exists`)
      t.equal(metric.callCount, grandTotal, `ensure ${metricName} has the right value`)
      t.end()
    })
  })
})
