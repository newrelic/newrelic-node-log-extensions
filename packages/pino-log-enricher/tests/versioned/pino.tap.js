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
})
