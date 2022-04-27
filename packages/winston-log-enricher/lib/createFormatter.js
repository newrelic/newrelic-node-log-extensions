/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const truncate = require('./truncate')

module.exports = function createFormatter(newrelic, winston) {
  // Stub API means agent is not enabled.
  if (!newrelic.shim) {
    // Continue to log original message with JSON formatter
    return winston.format.json
  }

  createModuleUsageMetric(newrelic.shim.agent)

  const jsonFormatter = winston.format.json()

  return winston.format((info, opts) => {
    if (info.exception === true) {
      // Due to Winston internals sometimes the error on the info object is a string or an
      // empty object, and so the message property is all we have
      const errorMessage = info.error.message || info.message || ''

      info['error.message'] = truncate(errorMessage)
      info['error.class'] =
        info.error.name === 'Error' ? info.error.constructor.name : info.error.name
      info['error.stack'] = truncate(info.error.stack)
      info.message = truncate(info.message)

      // Removes additional capture of stack to reduce overall payload/log-line size.
      // The server has a maximum of ~4k characters per line allowed.
      delete info.trace
      delete info.stack
    }

    if (info.timestamp) {
      newrelic.shim.logger.traceOnce(
        'Overwriting `timestamp` key; assigning original value to `original_timestamp`.'
      )
      info.original_timestamp = info.timestamp
    }
    info.timestamp = Date.now()

    const metadata = newrelic.getLinkingMetadata(true)

    // Add the metadata to the info object being logged
    Object.keys(metadata).forEach((m) => {
      info[m] = metadata[m]
    })

    const config = newrelic.shim.agent.config

    // TODO: update the peerdep on the New Relic repo and thereby
    // remove check for existence of application_logging config item
    if (
      config.application_logging &&
      config.application_logging.enabled &&
      config.application_logging.metrics.enabled
    ) {
      const levelLabel = info.level
      newrelic.shim.agent.metrics.getOrCreateMetric('Logging/lines').incrementCallCount()
      newrelic.shim.agent.metrics
        .getOrCreateMetric(`Logging/lines/${levelLabel}`)
        .incrementCallCount()
    }

    // Need three conditions to be true to send logs to the
    // aggregator:
    // 1) the aggregator exists
    // 2) we are in a transaction
    // 3) forwarding is enabled in the config
    const segment = newrelic.shim.getActiveSegment()
    const inTransaction = segment && segment.transaction

    const forwardingEnabled =
      config.application_logging &&
      config.application_logging.enabled &&
      config.application_logging.forwarding &&
      config.application_logging.forwarding.enabled

    if (newrelic.agent.logs && inTransaction && forwardingEnabled) {
      newrelic.agent.logs.add(info, segment.transaction.priority)
    }

    return jsonFormatter.transform(info, opts)
  })
}

function createModuleUsageMetric(agent) {
  agent.metrics
    .getOrCreateMetric('Supportability/ExternalModules/WinstonLogEnricher')
    .incrementCallCount()
}
