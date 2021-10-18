import { expectType, expectAssignable } from "tsd"
import winston = require('winston')

import logEnricher from '../../'

expectType<winston.Logform.FormatWrap>(logEnricher)
