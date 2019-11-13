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

module.exports = function instrument(shim, logform) {
  shim.wrapExport(logform, wrapLogform)
}

/* Wrap the `json` property on the `format` export of `logform`. This is what is called
 * when configuring Winston logging. Example:
 * const logger = winston.createLogger({
 *   level: 'info',
 *   format: winston.format.json(),
 *   ...
 */
function wrapLogform(shim, originalLogform) {
  let jsonProp = Object.getOwnPropertyDescriptor(originalLogform.format, 'json')
  shim.wrap(jsonProp, 'get', wrapJsonGetter)
  Object.defineProperty(originalLogform.format, 'json', jsonProp)
}

// `wrapReturn` will wrap the return value of `json` which is the `createWrapFormat`
// function.
function wrapJsonGetter(shim, json) {
  return shim.wrapReturn(json, wrapCreateFormatWrap)
}

// This will wrap the `transform` function on the `Format` object that's on the
// `createFormatWrap` function.
function wrapCreateFormatWrap(shim, _, __, createFormatWrap) {
  const proto = createFormatWrap.Format.prototype
  shim.wrap(proto, 'transform', wrapTransform)
}

function wrapTransform(shim, transform) {
  return function wrappedTransform(info) {
    // The linking metadata we want is exposed on the shim
    const metadata = shim.getLinkingMetadata()

    // Add the metadata to the info object being logged
    Object.keys(metadata).forEach(m => {
      info[m] = metadata[m]
    })

    // Winston's Format transform functions return the transformed info object so that it
    // can be passed on to another Format's transform function, allowing multiple Formats
    // to be combined. If we left the keys on the info object it could interfere with
    // other Formatters functionality. Capture the result and remove the metadata keys.
    let res = transform.apply(this, arguments)
    Object.keys(metadata).forEach(m => {
      delete res[m]
    })
    return res
  }
}
