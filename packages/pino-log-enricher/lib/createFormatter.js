/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const truncate = require('./truncate')

/**
 * Returns a series of formatters/mixins to enrich
 * logs to work with New Relic logs
 *
 * @param {Object} newrelic
 */
module.exports = function createFormatter(newrelic) {
  // Stub API means agent is not enabled.
  if (!newrelic.shim) {
    // Continue to log original message with JSON formatter
    return {}
  }

  createModuleUsageMetric(newrelic.shim.agent)

  // Using pino API to modify log lines
  // https://github.com/pinojs/pino/blob/master/docs/api.md#level
  return {
    timestamp: () => `,"timestamp": "${Date.now()}"`,
    messageKey: 'message',
    mixin() {
      return newrelic.getLinkingMetadata(true)
    },
    formatters: {
      log(obj) {
        if (obj.err) {
          obj['error.message'] = truncate(obj.err.message)
          obj['error.stack'] = truncate(obj.err.stack)
          obj['error.class'] = obj.err.name === 'Error' ? obj.err.constructor.name : obj.err.name
          delete obj.err
        }
        return obj
      }
    }
  }
}

/**
 * Adds a supportability metric to track customers
 * using the Pino log enricher
 *
 * @param {Agent} agent New Relic agent
 */
function createModuleUsageMetric(agent) {
  agent.metrics
    .getOrCreateMetric('Supportability/ExternalModules/PinoLogEnricher')
    .incrementCallCount()
}
