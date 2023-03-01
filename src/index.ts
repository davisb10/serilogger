export { LogEventLevel, LogEvent } from './logEvent';
export { Logger } from './logger';
export { ConsoleSink, ConsoleSinkOptions } from './consoleSink';
export { ColoredConsoleSink } from './coloredConsoleSink';
export { BatchedSink, BatchedSinkOptions } from './batchedSink';
export { DynamicLevelSwitch } from './dynamicLevelSwitch';
export { SeqSink, SeqSinkOptions } from './seqSink';
export { ApiSink, ApiSinkOptions } from './apiSink';
export { Sink } from './sink';

import { LoggerConfiguration } from './loggerConfiguration';

export function configure() {
    return new LoggerConfiguration();
}

export { LoggerConfiguration };
