'use strict'
const winston = require('winston')
module.exports = function createFormatter(newrelic) {
  const jsonFormatter = winston.format.json()
  return winston.format((info, opts) => {
    const metadata = newrelic.getLinkingMetadata(true)

    if (info.exception === true) {
      // Due to Winston internals sometimes the error on the info object is a string or an
      // empty object, and so the message property is all we have
      info['error.message'] = info.error.message || info.message || ''
      info['error.class'] = info.error.name === "Error" ?
        info.error.constructor.name : info.error.name
      info['error.stack'] = info.error.stack.substring(0, 1024)
    }

    if (info.timestamp) {
      newrelic.shim.logger.traceOnce(
        'Overwriting `timestamp` key; assigning original value to `original_timestamp`.'
      )
      info.original_timestamp = info.timestamp
    }
    info.timestamp = Date.now()

    // Add the metadata to the info object being logged
    Object.keys(metadata).forEach(m => {
      info[m] = metadata[m]
    })

    return jsonFormatter.transform(info, opts)
  })
}
