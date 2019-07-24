export {LogEventLevel} from './logEvent';
export {Logger} from './logger';
export {ConsoleSink, ConsoleSinkOptions} from './consoleSink';
export {BatchedSink, BatchedSinkOptions} from './batchedSink';
export {DynamicLevelSwitch} from './dynamicLevelSwitch';
export {Sink} from './sink';

import { LoggerConfiguration } from './loggerConfiguration';

export function configure() {
    return new LoggerConfiguration();
}

export { LoggerConfiguration };