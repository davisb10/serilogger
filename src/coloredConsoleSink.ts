import { ConsoleSink } from "./consoleSink";
import { LogEvent, LogEventLevel } from "./logEvent";


export class ColoredConsoleSink extends ConsoleSink {
    protected writeToConsole(logMethod: Function, prefix: string, e: LogEvent) {
        let output: string = `${e.messageTemplate.render(e.properties)}`;
        if (!this.options.removeLogLevelPrefix) output = `[${prefix}] ${output}`;
        output = `${this.logLevelToColor(e.level)}${output}\x1b[0m`;
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

    private logLevelToColor(level: LogEventLevel): string {
        switch(level) {
            case LogEventLevel.verbose:
            case LogEventLevel.debug:
                return '\x1b[2m';
            case LogEventLevel.warning:
                return '\x1b[31m'
            case LogEventLevel.fatal:
                return '\x1b[37m\x1b[41m'
            default:
                return ''
        }
    }
}