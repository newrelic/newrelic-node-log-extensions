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

## Support

Should you need assistance with New Relic products, you are in good hands with several support channels.

If the issue has been confirmed as a bug or is a feature request, file a GitHub issue.

**Support Channels**

* [New Relic Documentation](https://docs.newrelic.com/docs/logs/enable-log-management-new-relic/logs-context-nodejs/nodejs-configure-winston): Comprehensive guidance for using our platform
* [New Relic Community](https://discuss.newrelic.com/t/node-log-enrichers-logs-in-context/88806): The best place to engage in troubleshooting questions
* [New Relic Developer](https://developer.newrelic.com/): Resources for building a custom observability applications
* [New Relic University](https://learn.newrelic.com/): A range of online training for New Relic users of every level
* **[For Community Plus repositories]** [New Relic Technical Support](https://support.newrelic.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.newrelic.com/docs/licenses/license-information/general-usage-licenses/support-plan). 

## Privacy
At New Relic we take your privacy and the security of your information seriously, and are committed to protecting your information. We must emphasize the importance of not sharing personal data in public forums, and ask all users to scrub logs and diagnostic information for sensitive information, whether personal, proprietary, or otherwise.

We define “Personal Data” as any information relating to an identified or identifiable individual, including, for example, your name, phone number, post code or zip code, Device ID, IP address, and email address.

For more information, review [New Relic’s General Data Privacy Notice](https://newrelic.com/termsandconditions/privacy).

## Contribute

Contributions are welcome (and if you submit a Enhancement Request, expect to be invited to contribute it yourself :grin:). Please review our [Contributors Guide](CONTRIBUTING.md).

Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. If you'd like to execute our corporate CLA, or if you have any questions, please drop us an email at opensource+newrelic-winston-logenricher-node@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/newrelic/newrelic-winston-logenricher-node/security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To [all contributors](https://github.com/newrelic/newrelic-winston-logenricher-node/graphs/contributors), we thank you!  Without your contribution, this project would not be what it is today. We also host a community project page dedicated to [New Relic Winston Log Enricher](https://opensource.newrelic.com/projects/newrelic/newrelic-winston-logenricher-node).

## License

`newrelic-winston-logenricher-node` is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.


