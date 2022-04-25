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
    },
    hooks: {
      logMethod(inputArgs, method, level) {
        const config = newrelic.shim.agent.config

        // TODO: update the peerdep on the New Relic repo and thereby
        // remove check for existence of application_logging config item
        if (
          config.application_logging &&
          config.application_logging.enabled &&
          config.application_logging.metrics.enabled
        ) {
          // We'll try to use level labels for the metric name, but if
          // they don't exist, we'll default back to the level number.
          const levelLabel = this.levels.labels[level] || level
          newrelic.shim.agent.metrics.getOrCreateMetric('Logging/lines').incrementCallCount()
          newrelic.shim.agent.metrics
            .getOrCreateMetric(`Logging/lines/${levelLabel}`)
            .incrementCallCount()
        }
        return method.apply(this, inputArgs)
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
