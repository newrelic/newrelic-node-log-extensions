import { expectType, expectAssignable } from "tsd"
import winston = require('winston')

import logEnricherFactory from '../../'

const logEnricher = logEnricherFactory(winston)

expectType<winston.Logform.FormatWrap>(logEnricher)
