/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = {
  extends: '@newrelic',
  overrides: [
    {
      files: ['packages/**/tests/versioned/**/**'],
      rules: {
        'node/no-extraneous-require': 'off',
        'node/no-missing-require': 'off',
        'node/no-unpublished-require': 'off'
      }
    },
    {
      files: ['packages/**/tests/**/**/**'],
      rules: {
        'func-names': 'off',
        'max-nested-callbacks': 'off',
        'no-shadow': ['warn', { allow: ['t', 'err', 'shim', 'error'] }]
      }
    }
  ]
}
