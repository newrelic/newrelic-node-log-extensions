'use strict'

const MIN_LENGTH = 1021
const OUTPUT_LENGTH = 1024
const truncate = (str) => {
  if (str.length > OUTPUT_LENGTH) {
    return str.substring(0, MIN_LENGTH) + '...'
  }

  return str
}

module.exports = truncate
