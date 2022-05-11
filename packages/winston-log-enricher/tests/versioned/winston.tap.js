/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')
const formatFactory = require('../../lib/createFormatter.js')
const winston = require('winston')
const API = require('newrelic/api')
const StubApi = require('newrelic/stub_api')
const stream = require('stream')
const sinon = require('sinon')
const {
  makeStreamTest,
  validateAnnotations,
  getBasicAnnotations,
  getTransactionAnnotations,
  concatStreams,
  validateMsgs
} = require('./utils')

utils(tap)

tap.test('Winston instrumentation: log enricher', (t) => {
  t.autoend()

  let helper
  let api

  t.beforeEach(() => {
    helper = utils.TestAgent.makeInstrumented()
    helper.agent.config.entity_guid = 'guid'
    helper.agent.config.application_logging = {
      enabled: false
    }
    api = new API(helper.agent)
  })

  t.afterEach(() => {
    helper.unload()
  })

  t.test('should add external module metric when loading enricher', (t) => {
    formatFactory(api, winston)
    const metric = helper.agent.metrics.getMetric(
      'Supportability/ExternalModules/WinstonLogEnricher'
    )
    t.equal(metric.callCount, 1, 'should create external module metric')
    t.notOk(
      helper.agent.metrics.getMetric('Supportability/Logging/Nodejs/winston/enabled'),
      'should not create logging winston metric'
    )
    t.end()
  })

  t.test('should add linking metadata to default logs', (t) => {
    const config = helper.agent.config
    const basicAnnotations = getBasicAnnotations(config)
    // These should show up in the JSON via the combined formatters in the winston config.
    const loggingAnnotations = {
      timestamp: {
        type: 'number'
      }
    }

    // These will be assigned when inside a transaction below and should be in the JSON.
    let transactionAnnotations

    helper.agent.logs = { add: sinon.stub() }
    const streamTest = makeStreamTest(t)

    // These streams are passed to the Winston config below to capture the
    // output of the logging. `concat` captures all of a stream and passes it to
    // the given function.
    const jsonStream = concatStreams(streamTest, (msgs) => {
      validateMsgs({ msgs, t, basicAnnotations, loggingAnnotations, transactionAnnotations })
      t.equal(helper.agent.logs.add.callCount, 0, 'should not have called log aggregator')
    })

    const simpleStream = concatStreams(streamTest, (msgs) => {
      msgs.forEach((msg) => {
        t.throws(() => JSON.parse(msg), 'should not be json parsable')
        t.notOk(/timestamp/.exec(msg), 'should clean up timestamp generation')
        t.ok(/^info:.*trans$/.exec(msg), 'should not have metadata keys')
      })
    })

    // Example Winston setup to test
    const logger = winston.createLogger({
      transports: [
        // Log to a stream so we can test the output
        new winston.transports.Stream({
          level: 'info',
          format: formatFactory(api, winston)(),
          stream: jsonStream
        }),
        new winston.transports.Stream({
          level: 'info',
          format: winston.format.simple(),
          stream: simpleStream
        })
      ]
    })

    // Log some stuff, both in and out of a transaction
    logger.info('out of trans')

    helper.runInTransaction('test', () => {
      logger.info('in trans')

      transactionAnnotations = getTransactionAnnotations(api)

      // Force the streams to close so that we can test the output
      jsonStream.end()
      simpleStream.end()
    })
  })

  t.test('should add linking metadata to JSON logs', (t) => {
    const config = helper.agent.config

    const basicAnnotations = getBasicAnnotations(config)
    // These should show up in the JSON via the combined formatters in the winston config.
    const loggingAnnotations = {
      timestamp: {
        type: 'number'
      },
      original_timestamp: {
        type: 'string',
        val: new Date().getFullYear().toString()
      },
      label: {
        type: 'string',
        val: 'test'
      }
    }

    // These will be assigned when inside a transaction below and should be in the JSON.
    let transactionAnnotations

    const streamTest = makeStreamTest(t)

    // These streams are passed to the Winston config below to capture the
    // output of the logging. `concat` captures all of a stream and passes it to
    // the given function.
    const jsonStream = concatStreams(streamTest, (msgs) => {
      validateMsgs({ msgs, t, basicAnnotations, loggingAnnotations, transactionAnnotations })
    })

    // Example Winston setup to test
    const logger = winston.createLogger({
      transports: [
        // Log to a stream so we can test the output
        new winston.transports.Stream({
          level: 'info',
          // Format combos are used here to test that the shim doesn't affect
          // format piping
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY' }),
            winston.format.label({ label: 'test' }),
            formatFactory(api, winston)()
          ),
          stream: jsonStream
        })
      ]
    })

    // Log some stuff, both in and out of a transaction
    logger.info('out of trans')

    helper.runInTransaction('test', () => {
      logger.info('in trans')

      transactionAnnotations = getTransactionAnnotations(api)
      // Force the stream to close so that we can test the output
      jsonStream.end()
    })
  })

  t.test('should add error metadata to JSON logs', (t) => {
    // These should show up in the JSON via the combined formatters in the winston config.
    const annotations = {
      'error.message': {
        type: 'string',
        val: 'test error message'
      },
      'error.class': {
        type: 'string',
        val: 'TestError'
      },
      'error.stack': {
        type: 'string'
      }
    }

    // These streams are passed to the Winston config below to capture the output of the
    // logging. `concat` captures all of a stream and passes it to the given function.
    const errorStream = concatStreams(makeStreamTest(t), (msgs) => {
      msgs.forEach((msg) => {
        let msgJson
        t.doesNotThrow(() => (msgJson = JSON.parse(msg)), 'should be JSON')
        validateAnnotations(t, msgJson, annotations)
        t.notOk(msgJson.stack, 'Stack removed from JSON')
        t.notOk(msgJson.trace, 'trace removed from JSON')
      })
    })

    // Example Winston setup to test
    winston.createLogger({
      // There is a bug in winston around piping exception handler data
      // into the underlying transport that skips the formatters. To
      // get around this, move the `exceptionHandlers` into `transports` and
      // set the `handleExceptions` option to `true`.
      transports: [
        new winston.transports.Stream({
          level: 'info',
          format: formatFactory(api, winston)(),
          handleExceptions: true,
          stream: errorStream
        })
      ],
      exitOnError: false
    })

    helper.runInTransaction('test', () => {
      // Simulate an error being thrown to trigger Winston's error handling
      class TestError extends Error {
        constructor(msg) {
          super(msg)
          this.name = 'TestError'
        }
      }
      process.emit('uncaughtException', new TestError('test error message'))
      const metadata = api.getLinkingMetadata()

      // Capture info about the transaction that should show up in the logs
      annotations['trace.id'] = { type: 'string', val: metadata['trace.id'] }
      annotations['span.id'] = { type: 'string', val: metadata['span.id'] }

      // Force the stream to close so that we can test the output
      errorStream.end()
    })
  })

  t.test('should still log user data when agent disabled', (t) => {
    // These should show up in the JSON via the combined formatters in the winston config.
    const loggingAnnotations = {
      timestamp: {
        type: 'string' // original format
      },
      label: {
        type: 'string',
        val: 'test'
      }
    }

    const streamTest = makeStreamTest(t)

    // These streams are passed to the Winston config below to capture the
    // output of the logging. `concat` captures all of a stream and passes it to
    // the given function.
    const jsonStream = concatStreams(streamTest, (msgs) => {
      t.equal(msgs.length, 2)
      msgs.forEach((msg) => {
        // Make sure the JSON stream actually gets JSON
        let msgJson
        t.doesNotThrow(() => (msgJson = JSON.parse(msg)), 'should be JSON')

        // Verify the proper keys are there
        validateAnnotations(t, msgJson, loggingAnnotations)
      })
    })

    const simpleStream = concatStreams(streamTest, (msgs) => {
      msgs.forEach((msg) => {
        t.throws(() => JSON.parse(msg), 'should not be json parsable')
        t.notOk(/original_timestamp/.exec(msg), 'should clean up timestamp reassignment')
        t.ok(/^info:.*trans$/.exec(msg), 'should not have metadata keys')
      })
    })

    // Example Winston setup to test
    const logger = winston.createLogger({
      transports: [
        // Log to a stream so we can test the output
        new winston.transports.Stream({
          level: 'info',
          // Format combos are used here to test that the shim doesn't affect
          // format piping
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY' }),
            winston.format.label({ label: 'test' }),
            formatFactory(new StubApi(), winston)() // Stub API mimics disabled agent
          ),
          stream: jsonStream
        }),
        new winston.transports.Stream({
          level: 'info',
          format: winston.format.simple(),
          stream: simpleStream
        })
      ]
    })

    // Log some stuff, both in and out of a transaction
    logger.info('out of trans')

    helper.runInTransaction('test', () => {
      logger.info('in trans')

      // Force the streams to close so that we can test the output
      jsonStream.end()
      simpleStream.end()
    })
  })
})

tap.test('Winston instrumentation: application logging ', (t) => {
  t.autoend()

  let helper
  let api

  t.beforeEach(() => {
    helper = utils.TestAgent.makeInstrumented()
    helper.agent.config.application_logging = {
      enabled: true,
      metrics: {
        enabled: false
      },
      forwarding: {
        enabled: false
      },
      local_decorating: {
        enabled: false
      }
    }
    helper.agent.config.entity_guid = 'guid'
    api = new API(helper.agent)
  })

  t.afterEach(() => {
    helper.unload()
  })

  t.test('should add logging winston metric when as application logging plugin', (t) => {
    formatFactory(api, winston)
    const metric = helper.agent.metrics.getMetric('Supportability/Logging/Nodejs/winston/enabled')
    t.equal(metric.callCount, 1, 'should create logging winston metric')
    t.notOk(
      helper.agent.metrics.getMetric('Supportability/ExternalModules/WinstonLogEnricher'),
      'should not create external module metric'
    )
    t.end()
  })

  t.test('should decorate logs with NR-LINKING metadata when local decorating is enabled', (t) => {
    const config = helper.agent.config
    config.application_logging.local_decorating.enabled = true
    const streamTest = makeStreamTest(t)
    helper.agent.logs = { add: sinon.stub() }
    const metadata = []
    // These streams are passed to the Winston config below to capture the
    // output of the logging. `concat` captures all of a stream and passes it to
    // the given function.
    const jsonStream = concatStreams(streamTest, (msgs) => {
      t.equal(helper.agent.logs.add.callCount, 0, 'should not have called log aggregator')
      msgs.forEach((msg, index) => {
        msg = JSON.parse(msg)
        t.equal(msg.message, metadata[index], 'should match appropriate NR-LINKING data')
        t.same(
          Object.keys(msg).sort(),
          ['level', 'message'],
          'should not have NR metadata as json keys'
        )
      })
    })
    // Example Winston setup to test
    const logger = winston.createLogger({
      transports: [
        // Log to a stream so we can test the output
        new winston.transports.Stream({
          level: 'info',
          format: formatFactory(api, winston)(),
          stream: jsonStream
        })
      ]
    })

    // Log some stuff, both in and out of a transaction
    logger.info('out of trans')
    const meta = api.getLinkingMetadata()
    metadata.push(
      `out of trans NR-LINKING|${meta['entity.guid']}|${meta.hostname}|||${encodeURIComponent(
        meta['entity.name']
      )}|`
    )

    helper.runInTransaction('test', () => {
      logger.info('in trans')
      const transMeta = api.getLinkingMetadata()
      metadata.push(
        `in trans NR-LINKING|${transMeta['entity.guid']}|${transMeta.hostname}|${
          transMeta['trace.id']
        }|${transMeta['span.id']}|${encodeURIComponent(transMeta['entity.name'])}|`
      )
      jsonStream.end()
    })
  })

  const forwardingTests = [
    {
      title:
        'should add metadata to log lines and to log aggregator when application logging forwarding is enabled',
      config: { forwarding: { enabled: true } }
    },
    {
      title: 'should favor log forwarding when both forwarding and local decorating are enabled',
      config: { forwarding: { enabled: true }, local_decorating: { enabled: true } }
    }
  ]
  forwardingTests.forEach(({ config, title }) => {
    t.test(title, (t) => {
      helper.agent.config.application_logging = {
        ...helper.agent.config.application_logging,
        ...config
      }
      const streamTest = makeStreamTest(t)
      helper.agent.logs = { add: sinon.stub() }
      const metadata = []
      // These streams are passed to the Winston config below to capture the
      // output of the logging. `concat` captures all of a stream and passes it to
      // the given function.
      const jsonStream = concatStreams(streamTest, (msgs) => {
        t.equal(helper.agent.logs.add.callCount, 2, 'should have called log aggregator twice')
        msgs.forEach((msg, index) => {
          msg = JSON.parse(msg)
          t.same(
            msg,
            helper.agent.logs.add.args[index][0],
            'should have the expected enriched log message'
          )
          t.same(
            msg,
            { level: 'info', message: msg.message, timestamp: msg.timestamp, ...metadata[index] },
            'should add appropriate metadata to log line'
          )
          t.notOk(
            msg.message.includes(' NR-LINKING|'),
            'should not contain NR-LINKING metadata when forwarding is enabled'
          )
        })
      })
      // Example Winston setup to test
      const logger = winston.createLogger({
        transports: [
          // Log to a stream so we can test the output
          new winston.transports.Stream({
            level: 'info',
            format: formatFactory(api, winston)(),
            stream: jsonStream
          })
        ]
      })

      // Log some stuff, both in and out of a transaction
      logger.info('out of trans')
      metadata.push(api.getLinkingMetadata())

      helper.runInTransaction('test', () => {
        logger.info('in trans')
        metadata.push(api.getLinkingMetadata())
        jsonStream.end()
      })
    })
  })

  t.test('should count logger metrics', (t) => {
    const config = helper.agent.config
    config.application_logging.metrics.enabled = true
    helper.runInTransaction('winston-test', () => {
      const nullStream = new stream.Writable({
        write: (chunk, encoding, cb) => {
          cb()
        }
      })

      const logger = winston.createLogger({
        transports: [
          new winston.transports.Stream({
            level: 'debug',
            format: formatFactory(api, winston)(),
            // We don't care about the output for this test, just
            // total lines logged
            stream: nullStream
          })
        ]
      })
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

      // Close the stream so that the logging calls are complete
      nullStream.end()

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

  const configValues = [
    {
      name: 'application_logging is not enabled',
      config: { enabled: false, metrics: { enabled: true } }
    },
    {
      name: 'application_logging.metrics is not enabled',
      config: { enabled: true, metrics: { enabled: false } }
    }
  ]
  configValues.forEach(({ name, config }) => {
    t.test(`should not count logger metrics when ${name}`, (t) => {
      helper.agent.config.application_logging = config
      helper.runInTransaction('winston-test', () => {
        const nullStream = new stream.Writable({
          write: (chunk, encoding, cb) => {
            cb()
          }
        })

        const logger = winston.createLogger({
          transports: [
            new winston.transports.Stream({
              level: 'info',
              format: formatFactory(api, winston)(),
              // We don't care about the output for this test, just
              // total lines logged
              stream: nullStream
            })
          ]
        })

        logger.info('This is a log message test')

        // Close the stream so that the logging calls are complete
        nullStream.end()
        const linesMetric = helper.agent.metrics.getMetric('Logging/lines')
        t.notOk(linesMetric, 'should not create Logging/lines metric')
        const levelMetric = helper.agent.metrics.getMetric('Logging/lines/info')
        t.notOk(levelMetric, 'should not create Logging/lines/info metric')
        t.end()
      })
    })
  })
})
