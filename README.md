[![Community Plus header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# New Relic Node.js logging extensions

The New Relic logging plugins are extensions for common Node.js logging frameworks. They are designed to capture app, transaction trace, and span information as part of your application log messages.

For the latest information, please see [our docs](https://docs.newrelic.com/docs/logs/new-relic-logs/enable-logs-context/enable-logs-context-apm-agents).

We support:

* [Winston](packages/winston-log-enricher/README.md)
* [Pino](packages/pino-log-enricher/README.md)

## Testing

This module includes a list of unit and functional tests.  To run these tests, use the following command:

```sh
npm test
```

You may also run individual test suites with the following commands:

```sh
npm run unit # Unit tests
npm run versioned # Functional tests
```

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

**Support channels**

* [New Relic docs](https://docs.newrelic.com/docs/logs/enable-log-management-new-relic/logs-context-nodejs/nodejs-configure-winston): Comprehensive guidance for using our platform.
* [New Relic Community](https://discuss.newrelic.com/t/node-log-enrichers-logs-in-context/88806): The best place to engage in troubleshooting questions.
* [New Relic developer site](https://developer.newrelic.com/): Resources for building a custom observability applications.
* [New Relic University](https://learn.newrelic.com/): A range of online training for New Relic users of every level.
* **[For Community Plus repositories]** [New Relic Technical Support](https://support.newrelic.com/) 24/7/365 ticketed support. Read more about our [Technical support offerings](https://docs.newrelic.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Contribute

We encourage your contributions to improve New Relic's Node.js logging extensions! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To all contributors, we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [New Relic Node.js logging extensions](https://opensource.newrelic.com/projects/newrelic-node-log-extensions).

## License
The New Relic Node.js loggin extensions are licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) license.
