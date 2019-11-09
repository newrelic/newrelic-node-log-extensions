'use strict'

/**
 * Allows users to `require('@newrelic/logform')` directly in their app. If
 * they for some reason choose to explicitly use an older version of our
 * instrumentation then the supportability metrics for custom instrumentation
 * will trigger.
 */
var newrelic = require('newrelic')
newrelic.instrument('logform', require('./lib/instrumentation'))
