[![Community Plus header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# @newrelic/pino-enricher

New Relic's official `pino` log enricher for use with the
[Node Agent](https://github.com/newrelic/node-newrelic).

The `pino-enricher` log format adds additional app, distributed trace and span information output as JSON-formatted log messages. This is most commonly used with the New Relic Logs product.

For the latest information, please see [the New Relic docs](https://docs.newrelic.com/docs/logs/new-relic-logs/enable-logs-context/enable-logs-context-apm-agents).

## Installation

```bash
npm install @newrelic/pino-enricher
```

## Usage

```js
// index.js
const nrPino = require('@newrelic/pino-enricher')
const pino = require('pino')
const logger = pino(nrPino())
```

The New Relic formatter can be used individually or combined with other
formatters as the final format.

**Note for unhandledException log messages:**

The stack trace will be written to the `error.stack` property.

To accommodate the New Relic Logs 4000 character log line limit, the `stack` and `trace` properties will be removed and the `error.message` and `error.stack` values will be truncated to 1024 characters.

### Version Requirements

`pino` versions 7.0.0 and greater are supported.

For more information, including currently supported Node versions, please see the agent [compatibility and requirements](https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent).

For general agent setup, please see the agent [installation guide](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent).

