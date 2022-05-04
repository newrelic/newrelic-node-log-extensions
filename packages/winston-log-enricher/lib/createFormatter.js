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
  } else if (newrelic.shim.isWrapped(winston.createLogger)) {
    newrelic.shim.logger.warn('Winston is already instrumented. Skipping enrichment...')
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

    const forwardingEnabled =
      config.application_logging &&
      config.application_logging.enabled &&
      config.application_logging.forwarding &&
      config.application_logging.forwarding.enabled

    if (newrelic.agent.logs && forwardingEnabled) {
      const segment = newrelic.shim.getActiveSegment()

      // Priority could be null even if we have a transaction, as the
      // priority is usually set at the end of transactions, DT being
      // a notable exception. Otherwise, matching log priority to the
      // transaction priority can increase the odds of both being
      // sampled.
      const priority = segment && segment.transaction && segment.transaction.priority
      newrelic.agent.logs.add(info, priority)
    }

    return jsonFormatter.transform(info, opts)
  })
}

function createModuleUsageMetric(agent) {
  agent.metrics
    .getOrCreateMetric('Supportability/ExternalModules/WinstonLogEnricher')
    .incrementCallCount()
  agent.metrics
    .getOrCreateMetric('Supportability/Logging/Nodejs/winston/enabled')
    .incrementCallCount()
}
