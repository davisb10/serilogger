export { ApiSink, ApiSinkOptions } from './apiSink';
export { BatchedSink, BatchedSinkOptions } from './batchedSink';
export { ColoredConsoleSink } from './coloredConsoleSink';
export { ConsoleSink, ConsoleSinkOptions } from './consoleSink';
export { DynamicLevelSwitch } from './dynamicLevelSwitch';
export { LogEvent, LogEventLevel } from './logEvent';
export { Logger } from './logger';
export { MessageTemplate } from './messageTemplate';
export { SeqSink, SeqSinkOptions } from './seqSink';
export { Sink } from './sink';

import { LoggerConfiguration } from './loggerConfiguration';

export function configure() {
	return new LoggerConfiguration();
}

export { LoggerConfiguration };

