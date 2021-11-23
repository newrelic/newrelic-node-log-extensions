[![Community Plus header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# @newrelic/winston-enricher

New Relic's official `winston` log enricher for use with the
[Node Agent](https://github.com/newrelic/node-newrelic).

The `winston-enricher` log format adds additional app, distributed trace and span information output as JSON-formatted log messages. This is most commonly used with the New Relic Logs product.

For the latest information, please see [the New Relic docs](https://docs.newrelic.com/docs/logs/new-relic-logs/enable-logs-context/enable-logs-context-apm-agents).

## Installation

```bash
npm install @newrelic/winston-enricher
```

## Usage

```js
// index.js
require('newrelic')
const newrelicFormatter = require('@newrelic/winston-enricher')
```

The New Relic formatter can be used individually or combined with other
formatters as the final format.

```js
format: winston.format.combine(
  winston.format.label({label: 'test'}),
  newrelicFormatter()
)
```

**Note for unhandledException log messages:**

The stack trace will be written to the `error.stack` property.

To accommodate the New Relic Logs 4000 character log line limit, the `stack` and `trace` properties will be removed and the `message`, `error.message` and `error.stack` values will be truncated to 1024 characters.

### Version Requirements

`winston` versions 3.0.0 and greater are supported.

For more information, including currently supported Node versions, please see the agent [compatibility and requirements](https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent).

For general agent setup, please see the agent [installation guide](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent).

