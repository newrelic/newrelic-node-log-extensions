/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const truncate = require('./truncate')

module.exports = function createFormatter(newrelic) {
  // Stub API means agent is not enabled.
  if (!newrelic.shim) {
    // Continue to log original message with JSON formatter
    return {}
  }

  createModuleUsageMetric(newrelic.shim.agent)

  return {
    timestamp: () => `${Date.now()}`,
    mixin(obj) {
      return newrelic.getLinkingMetadata(true)
    },
    serializers: {
      err: function truncateErr(err) {
        return {
          type: err.name,
          message: truncate(err.message),
          stack: truncate(err.stack)
        }
      }
    }
  }
}

function createModuleUsageMetric(agent) {
  agent.metrics
    .getOrCreateMetric('Supportability/ExternalModules/PinoLogEnricher')
    .incrementCallCount()
}
