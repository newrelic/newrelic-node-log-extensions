'use strict'

/* Winston v3.0.0+ uses the `logform` module to format its logs. This module exports
 * `format`, which is a function which will create log formatters. On this format function
 * are properties for all the different formatters. When a get()ing one of these
 * properties, it requires that formatter's module and returns it. The formatter modules
 * import the `format` function, pass a function to it that formats a log message, and
 * export the result. The `format` function takes a log message formatting function, puts
 * it on a `Format` object's prototype on `transform`, and returns a function named
 * `createWrapFormat` that accepts options and returns a new instance of this `Format`
 * object with the options passed to it.
 *
 * The code below wraps the `transform` method on the `Format` object when the `json`
 * formatter is returned from the property on `format`.
 */

module.exports = function instrumentLogformJson(shim, logformJson) {
  wrapCreateFormatWrap(shim, logformJson, 'transform', logformJson)
}

// This will wrap the `transform` function on the `Format` object that's on the
// `createFormatWrap` function.
function wrapCreateFormatWrap(shim, fn, fnName, createFormatWrap) {
  const proto = createFormatWrap.Format.prototype
  shim.wrap(proto, 'transform', wrapTransform)
}

function wrapTransform(shim, transform) {
  return function wrappedTransform(info) {
    // The linking metadata we want is exposed on the shim
    const metadata = shim.getLinkingMetadata()

    let timestampSet = false
    if (info.timestamp == null) {
      info.timestamp = Date.now()
      timestampSet = true
    }

    // Add the metadata to the info object being logged
    Object.keys(metadata).forEach(m => {
      info[m] = metadata[m]
    })

    let errorSet = false
    if (info.exception === true) {
      // Due to Winston internals sometimes the error on the info object is a string or an
      // empty object, and so the message property is all we have
      info['error.message'] = info.error.message || info.message || ''
      info['error.class'] = info.error.name === "Error" ?
        info.error.constructor.name : info.error.name
      info['error.stack'] = info.error.stack.substring(0, 1024)
    }

    // Winston's Format transform functions return the transformed info object so that it
    // can be passed on to another Format's transform function, allowing multiple Formats
    // to be combined. If we left the keys on the info object it could interfere with
    // other Formatters functionality. Capture the result and remove the metadata keys.
    let res = transform.apply(this, arguments)
    Object.keys(metadata).forEach(m => {
      delete res[m]
    })

    if (timestampSet) {
      delete res.timestamp
    }

    if (errorSet) {
      delete res['error.message']
      delete res['error.class']
      delete res['error.stack']
    }

    return res
  }
}
