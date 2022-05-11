/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const truncate = require('./truncate')

/**
 * This package is being used to facilitate
 * the application logging use cases and log enrichment.
 * It is worth noting that the features below are mutually
 * exclusive.
 *
 * The application logging use cases are local log decorating
 * and log forwarding.
 *
 * Local log decorating appends `NR-LINKING` piped metadata to
 * the message key in log line. You must configure a log forwarder to get
 * this data to NR1.
 *
 * Log forwarding includes the linking metadata as keys on logging
 * object as well as adds the log line to the agent log aggregator.
 *
 * Log enrichment includes the linking metadata as keys on the logging
 * object. You must configure a log forwarder to get this data to NR1.
 */
module.exports = function createFormatter(newrelic, winston) {
  // Stub API means agent is not enabled.
  if (!newrelic.shim) {
    // Continue to log original message with JSON formatter
    return winston.format.json
  } else if (newrelic.shim.isWrapped(winston.createLogger)) {
    /*
     * If a customer upgrades the agent to 8.11.0 `application_logging.enabled` is true.
     * It will cause this package to no longer function as a log enricher because it would
     * return here because the agent has already wrapped `winston.createLogger`.  We need to
     * set `application_logging.enabled` to false so when the formatter below gets invoked
     * it will flow through the `isLogEnricher` branch and properly enrich logs.
     */
    if (newrelic.shim.agent.config.application_logging) {
      newrelic.shim.agent.config.application_logging.enabled = false
    }
    newrelic.shim.logger.warn(
      'winston is already instrumented. Disabling application logging and using package as log enricher.'
    )
    createModuleUsageMetric(newrelic.shim.agent, newrelic.shim.agent.config)

    return winston.format.json
  }

  const config = newrelic.shim.agent.config
  createModuleUsageMetric(newrelic.shim.agent, config)

  const jsonFormatter = winston.format.json()

  return winston.format((info, opts) => {
    if (isMetricsEnabled(config)) {
      incrementLoggingLinesMetrics(info, newrelic)
    }

    if (isLogFowardingEnabled(config, newrelic)) {
      const metadata = newrelic.getLinkingMetadata(true)
      reformatLogLine(info, metadata, newrelic)
      newrelic.agent.logs.add(info)
    } else if (isLocalDecoratingEnabled(config)) {
      const metadata = newrelic.getLinkingMetadata(true)
      info.message += formatLinkingMetadata(metadata)
    } else if (isLogEnricher(config)) {
      const metadata = newrelic.getLinkingMetadata(true)
      reformatLogLine(info, metadata, newrelic)
    }

    return jsonFormatter.transform(info, opts)
  })
}

/**
 * Adds supportability metric based on agent config
 *  1. if log enricher `Supportability/ExternalModules/WinstonLogEnricher`
 *  2. if application logging `Supportability/Logging/Nodejs/winston/enabled`
 *
 * @param {Agent} agent new relic agent instance
 */
function createModuleUsageMetric(agent, config) {
  if (isLogEnricher(config)) {
    agent.metrics
      .getOrCreateMetric('Supportability/ExternalModules/WinstonLogEnricher')
      .incrementCallCount()
  } else {
    agent.metrics
      .getOrCreateMetric('Supportability/Logging/Nodejs/winston/enabled')
      .incrementCallCount()
  }
}

/**
 * Decorates the log line with  truncated error.message, error.class, and error.stack and removes
 * trace and stack
 *
 * @param {Object} info a log line
 */
function reformatError(info) {
  // Due to Winston internals sometimes the error on the info object is a string or an
  // empty object, and so the message property is all we have
  const errorMessage = info.error.message || info.message || ''

  info['error.message'] = truncate(errorMessage)
  info['error.class'] = info.error.name === 'Error' ? info.error.constructor.name : info.error.name
  info['error.stack'] = truncate(info.error.stack)
  info.message = truncate(info.message)

  // Removes additional capture of stack to reduce overall payload/log-line size.
  // The server has a maximum of ~4k characters per line allowed.
  delete info.trace
  delete info.stack
}

/**
 * Turns timestamp into unix timestamp. If timestamp existed it will move original
 * to `original_timestamp` key
 */
function reformatTimestamp(info, newrelic) {
  if (info.timestamp) {
    newrelic.shim.logger.traceOnce(
      'Overwriting `timestamp` key; assigning original value to `original_timestamp`.'
    )
    info.original_timestamp = info.timestamp
  }
  info.timestamp = Date.now()
}

// TODO: update the peerdep on the New Relic repo and thereby
// remove check for existence of application_logging config item
// in the next 4 function

/**
 * Checks if application_logging and application_logging.metrics are both enabled
 * @param {Object} config agent config
 * @return {Boolean}
 */
function isMetricsEnabled(config) {
  return !!(
    config.application_logging &&
    config.application_logging.enabled &&
    config.application_logging.metrics &&
    config.application_logging.metrics.enabled
  )
}

/**
 * Checks if application_logging and application_logging.local_decorating are both enabled
 * @param {Object} config agent config
 * @return {Boolean}
 */
function isLocalDecoratingEnabled(config) {
  return !!(
    config.application_logging &&
    config.application_logging.enabled &&
    config.application_logging.local_decorating &&
    config.application_logging.local_decorating.enabled
  )
}

/**
 * Checks if log aggregator exists on agent & application_logging and application_logging.forwarding are both enabled
 * @param {Object} config agent config
 * @param {Object} newrelic API instance
 * @return {Boolean}
 */
function isLogFowardingEnabled(config, newrelic) {
  return !!(
    newrelic.agent.logs &&
    config.application_logging &&
    config.application_logging.enabled &&
    config.application_logging.forwarding &&
    config.application_logging.forwarding.enabled
  )
}

/**
 * Checks if application_logging is disabled
 *
 * @param {Object} config agent config
 * @return {Boolean}
 */
function isLogEnricher(config) {
  return !(config.application_logging && config.application_logging.enabled)
}

/**
 * Formats the NR-LINKING blob that matches the spec
 * `NR-LINKING|{entity.guid}|{hostname}|{trace.id}|{span.id}|{entity.name}|
 */
function formatLinkingMetadata(metadata) {
  return ` NR-LINKING|${getValue('entity.guid')}|${getValue('hostname')}|${getValue(
    'trace.id'
  )}|${getValue('span.id')}|${encodeURIComponent(getValue('entity.name'))}|`

  /**
   * Retries value for a given key but defaults to `` if falsey
   *
   * @param {string} key in linking metadata
   * @return {string}
   */
  function getValue(key) {
    return metadata[key] || ''
  }
}

/**
 * Increments both `Logging/lines` and `Logging/lines/<level>` call count
 *
 * @param {Object} info log line
 * @param {Object} newrelic API instance
 */
function incrementLoggingLinesMetrics(info, newrelic) {
  const { level } = info
  newrelic.shim.agent.metrics.getOrCreateMetric('Logging/lines').incrementCallCount()
  newrelic.shim.agent.metrics.getOrCreateMetric(`Logging/lines/${level}`).incrementCallCount()
}

/**
 * Reformats a log line by reformatting errors, timestamp and adding
 * new relic linking metadata(context)
 *
 * @param {Object} info log line
 * @param {Object} metadata linking metadata
 * @param {Object} newrelic API instance
 */
function reformatLogLine(info, metadata, newrelic) {
  if (info.exception === true) {
    reformatError(info)
  }

  reformatTimestamp(info, newrelic)

  // Add the metadata to the info object being logged
  Object.assign(info, metadata)
}
