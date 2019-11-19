'use strict'

/**
 * Allows users to `require('@newrelic/winston-enricher')` directly in their app. If
 * they for some reason choose to explicitly use an older version of our
 * instrumentation then the supportability metrics for custom instrumentation
 * will trigger.
 */
const newrelic = require('newrelic')
const formatterFactory = require('./lib/createFormatter.js')
module.exports = formatterFactory(newrelic)
