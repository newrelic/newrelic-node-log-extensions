# CHANGELOG

## 1.0.0 (11/02/2020)

* Fixed several bugs where the formatter would have unexpected results when the agent is disabled. Fixes include:
  * Now always logs via JSON format.
  * Does not modify original content when the agent is disabled.
  * Does not crash with the existence of a timestamp field when the agent is disabled.
* Added module load support metric.
* Breaking: Moved agent dependency to be a peer dependency. It is now required the leveraging application install 'newrelic' directly.
  * This prevents attempts to load multiple copies of the agent. Previously, when an application referenced 'newrelic' the formatter would attempt to load a second copy of the agent. The agent protects against this behavior but it is preferred we avoid this. Also, the prior dependency was too restrictive and would have pinned the formatters version to 6.x versions of the agent.
* Removed Node v8 from CI.
* Added Node 14 to CI.
* Update README for consistency with New Relic OSS repositories.
* Remove Code of Conduct doc and link to New Relic org.
* Added Open Source Policy Workflow.
* Bumped node-test-utilities version to ^4.0.0.
* Updated third party notices including new footer language.
* Modifies default branch name wording in contributing guide.
* Migrated CI to GitHub Actions from CircleCI.

## 0.1.1 (02/14/2020)

* Handle getLinkingMetadata not returning an object.

## 0.1.0 (11/26/2019)

* Initial release of log formatter.
