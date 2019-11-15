# newrelic-winston-logenricher-node

New Relic's official `winston` log enricher for use with the
[Node Agent](https://github.com/newrelic/node-newrelic).

The `winston-enricher` adds additional app, distributed trace and span information to your JSON-formatted log messages. This is most commonly used with the New Relic logs product.

For the latest information, please see [the New Relic docs](https://docs.newrelic.com/docs/logs/new-relic-logs/enable-logs-context/enable-logs-context-apm-agents).

## Getting Started

### Installation

```bash
npm install @newrelic/winston-enricher
```

### Usage

```js
// index.js
require('newrelic')
require('@newrelic/winston-enricher')
```

Include the necessary CommonJS imports prior to the loading of other modules to ensure proper instrumentation. This module is not auto-included by the Node Agent.

#### [Required] JSON Formatted Logs

JSON formatting is required by the New Relic Logs product. This module will not reformat other formats into JSON for log processing automatically.

By default, `winston` uses a JSON format which is supported. You may also leverage the explicit formatter, used by itself or with combined formatters such as:

```js
format: winston.format.combine(
  winston.format.label({label: 'test'}),
  winston.format.json()
)
```

### Version Requirements

`winston` versions 3.0.0 and greater are supported.

For more information, including currently supported Node versions, please see the agent [compatibility and requirements](https://docs.newrelic.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent).

For general agent setup, please see the agent [installation guide](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent).

## Open Source License

This project is distributed under the [Apache 2 license](LICENSE).

## Support

New Relic has open-sourced this project. This project is provided AS-IS WITHOUT WARRANTY OR DEDICATED SUPPORT. Issues and contributions should be reported to the project here on GitHub.

We encourage you to bring your experiences and questions to the [Explorers Hub](https://discuss.newrelic.com) where our community members collaborate on solutions and new ideas.

## Community

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

https://discuss.newrelic.com

## Issues / Enhancement Requests

Issues and enhancement requests can be submitted in the [Issues tab of this repository](../../issues). Please search for and review the existing open issues before submitting a new issue.

## Contributing

Contributions are welcome (and if you submit a Enhancement Request, expect to be invited to contribute it yourself :grin:). Please review our [Contributors Guide](CONTRIBUTING.md).

Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. If you'd like to execute our corporate CLA, or if you have any questions, please drop us an email at opensource+newrelic-winston-logenricher-node@newrelic.com.
