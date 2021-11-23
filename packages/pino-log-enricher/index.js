/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Allows users to `require('@newrelic/pino-enricher')` directly in their app. If
 * they for some reason choose to explicitly use an older version of our
 * instrumentation then the supportability metrics for custom instrumentation
 * will trigger.
 */
const newrelic = require('newrelic')
const createFormatter = require('./lib/createFormatter')
module.exports = createFormatter.bind(null, newrelic)
