import { LogEventLevel, LogEvent, isEnabled } from './logEvent';
import { Sink } from './sink';

export interface ConsoleProxy {
    error(message?: any, ...properties: any[]): any;

    warn(message?: any, ...properties: any[]): any;

    info(message?: any, ...properties: any[]): any;

    debug(message?: any, ...properties: any[]): any;

    log(message?: any, ...properties: any[]): any;
}

export interface ConsoleSinkOptions {
    console?: any;
    includeTimestamps?: boolean;
    includeProperties?: boolean;
    restrictedToMinimumLevel?: LogEventLevel;
    removeLogLevelPrefix?: boolean;
}

export const defaultConsoleSinkOptions: ConsoleSinkOptions = {
    removeLogLevelPrefix: false,
    includeTimestamps: false,
    includeProperties: false
};

export class ConsoleSink implements Sink {
    protected options: ConsoleSinkOptions;
    private console: ConsoleProxy;

    constructor(options?: ConsoleSinkOptions) {
        this.options = {
            ...defaultConsoleSinkOptions,
            ...(options || {})
        };
        const internalConsole = this.options.console || typeof console !== 'undefined' && console || null;
        const stub = function () {
        };

        // console.debug is no-op for Node, so use console.log instead.
        const nodeConsole = !this.options.console &&
            typeof process !== 'undefined' &&
            process.versions &&
            process.versions.node;

        this.console = {
            error: (internalConsole && (internalConsole.error || internalConsole.log)) || stub,
            warn: (internalConsole && (internalConsole.warn || internalConsole.log)) || stub,
            info: (internalConsole && (internalConsole.info || internalConsole.log)) || stub,
            debug: (internalConsole && ((!nodeConsole && internalConsole.debug) || internalConsole.log)) || stub,
            log: (internalConsole && internalConsole.log) || stub
        };
    }

    public emit(events: LogEvent[]) {
        for (let i = 0; i < events.length; ++i) {
            const e = events[i];
            if (!isEnabled(this.options.restrictedToMinimumLevel, e.level))
                continue;

            switch (e.level) {
                case LogEventLevel.fatal:
                    this.writeToConsole(this.console.error, 'Fatal', e);
                    break;

                case LogEventLevel.error:
                    this.writeToConsole(this.console.error, 'Error', e);
                    break;

                case LogEventLevel.warning:
                    this.writeToConsole(this.console.warn, 'Warning', e);
                    break;

                case LogEventLevel.information:
                    this.writeToConsole(this.console.info, 'Information', e);
                    break;

                case LogEventLevel.debug:
                    this.writeToConsole(this.console.debug, 'Debug', e);
                    break;

                case LogEventLevel.verbose:
                    this.writeToConsole(this.console.debug, 'Verbose', e);
                    break;

                default:
                    this.writeToConsole(this.console.log, 'Log', e);
                    break;
            }
        }
        return null;
    }

    public flush() {
        return Promise.resolve();
    }

    protected writeToConsole(logMethod: Function, prefix: string, e: LogEvent) {
        let output: string = `${e.messageTemplate.render(e.properties)}`;
        if (!this.options.removeLogLevelPrefix) output = `[${prefix}] ${output}`;
        if (this.options.includeTimestamps) output = `${e.timestamp} ${output}`;
        const values: any[] = [];
        if (this.options.includeProperties) {
            for (const key in e.properties) {
                if (e.properties.hasOwnProperty(key)) {
                    values.push(e.properties[key]);
                }
            }
        }
        if (e.error instanceof Error) {
            values.push('\n', e.error);
        }
        logMethod(output, ...values);
    }
}
