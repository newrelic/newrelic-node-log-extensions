import {expectType} from 'tsd';
import type FormatWrap from 'winston';
const logenricher = require('.');

expectType<typeof FormatWrap>(logenricher({}));
