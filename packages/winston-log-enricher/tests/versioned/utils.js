/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const utils = module.exports

const concat = require('concat-stream')

/**
 * Keep track of the number of streams that we're waiting to close and test.  Also clean
 * up the info object used by winston/logform to make it easier to test.
 *
 * @param {Tap.Test} t
 */
utils.makeStreamTest = function makeStreamTest(t) {
  let toBeClosed = 0

  // Assert function will receive log strings to be tested
  return function streamTest(assertFn) {
    // When creating a stream test, increment the number of streams to wait to close.
    ++toBeClosed

    // This function will be given to `concat` and will receive an array of messages
    // from Winston when the stream closes.
    return function (msgs) {
      // We only want the log string from the message object. This is stored on the
      // object on a key that is a symbol. Grab that and give it to the assert function.
      const logStrings = msgs.map((msg) => {
        const symbols = Object.getOwnPropertySymbols(msg)
        const msgSym = symbols.filter((s) => s.toString() === 'Symbol(message)')[0]
        return msg[msgSym]
      })

      assertFn(logStrings)

      // If this function is called it is because the stream closed. Decrement the
      // number of streams we're waiting for and end the test if it's the last one.
      if (--toBeClosed === 0) {
        t.end()
      }
    }
  }
}

/**
 * Concatenates the test stream with an assertion callback
 *
 * @param {Stream} testStream
 * @param {Function} cb assertion callback with all messages emitted during test run
 */
utils.concatStreams = function concatStreams(testStream, cb) {
  return concat(
    testStream((msgs) => {
      cb(msgs)
    })
  )
}

/**
 * Helper function to compare a json-parsed log msg against the values we expected
 *
 * @param {Tap.Test} t
 * @param {string} msg actual message
 * @param {string} expected expected message
 */
utils.validateAnnotations = function validateAnnotations(t, msg, expected) {
  Object.keys(expected).forEach((a) => {
    const ex = expected[a]
    t.type(msg[a], ex.type, `should have the proper keys (${a})`)
    if (ex.val != null) {
      t.equal(msg[a], ex.val, `should have the expected value (${a})`)
    }
  })
}

/**
 * Get the basic context annotations for every log line that is decorated
 *
 * @param {Object} config agent config
 * @return {Object}
 */
utils.getBasicAnnotations = function getBasicAnnotations(config) {
  return {
    'entity.name': {
      type: 'string',
      val: config.applications()[0]
    },
    'entity.type': {
      type: 'string',
      val: 'SERVICE'
    },
    'hostname': {
      type: 'string',
      val: config.getHostnameSafe()
    },
    'entity.guid': {
      type: 'string',
      val: config.entity_guid
    }
  }
}

/**
 * Get the transaction ontext annotations for every log line that is decorated
 *
 * @param {Object} newrelic agent instance
 * @return {Object}
 */
utils.getTransactionAnnotations = function getTransactionAnnotations(newrelic) {
  const metadata = newrelic.getLinkingMetadata()
  return {
    'trace.id': {
      type: 'string',
      val: metadata['trace.id']
    },
    'span.id': {
      type: 'string',
      val: metadata['span.id']
    }
  }
}

/**
 * Validates every message within a test stream:
 *  verifies it can parse message as JSON
 *  validates the basic NR metadata in message `entity.*` and `hostname`
 *  validates packages key additions(like timestamp)
 *  if message is `in trans` it validates the trace.id and span.id
 */
utils.validateMsgs = function validateMsgs({
  t,
  msgs,
  basicAnnotations,
  loggingAnnotations,
  transactionAnnotations
}) {
  msgs.forEach((msg) => {
    // Make sure the JSON stream actually gets JSON
    let msgJson
    t.doesNotThrow(() => (msgJson = JSON.parse(msg)), 'should be JSON')
    // Verify the proper keys are there
    utils.validateAnnotations(t, msgJson, basicAnnotations)
    utils.validateAnnotations(t, msgJson, loggingAnnotations)
    // Test that transaction keys are there if in a transaction
    if (msgJson.message === 'in trans') {
      utils.validateAnnotations(t, msgJson, transactionAnnotations)
    }
  })
}
