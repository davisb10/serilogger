import { Pipeline } from './pipeline';
import { Logger } from './logger';
import { LogEvent, LogEventLevel, isEnabled, LogEventLevelSwitch } from './logEvent';
import { DynamicLevelSwitch, DynamicLevelSwitchStage } from './dynamicLevelSwitch';
import { FilterStage } from './filterStage';
import { Sink, SinkStage } from './sink';
import { EnrichStage, ObjectFactory } from './enrichStage';
import { ConsoleSink } from './consoleSink';
import { ColoredConsoleSink } from './coloredConsoleSink';
import { SeqSink } from './seqSink';

export interface MinLevel extends LogEventLevelSwitch<LoggerConfiguration> {
    (levelOrSwitch: LogEventLevel | string | number | DynamicLevelSwitch): LoggerConfiguration;
}

/**
 * Configures pipelines for new logger instances.
 */
export class LoggerConfiguration {
    private readonly _pipeline: Pipeline;
    private _suppressErrors: boolean;

    constructor() {
        this._pipeline = new Pipeline();
        this._suppressErrors = true;
    }

    /**
     * Adds a sink to the pipeline.
     * @param {Sink} sink The sink to add.
     */
    writeTo(sink: Sink): LoggerConfiguration {
        this._pipeline.addStage(new SinkStage(sink));
        return this;
    }

    /**
     * Sets the minimum level for any subsequent stages in the pipeline.
     */
    minLevel: MinLevel = Object.assign((levelOrSwitch: LogEventLevel | string | number | DynamicLevelSwitch): LoggerConfiguration => {
        if (typeof levelOrSwitch === 'undefined' || levelOrSwitch === null) {
            throw new TypeError('Argument "levelOrSwitch" is not a valid LogEventLevel value or DynamicLevelSwitch instance.');
        } else if (levelOrSwitch instanceof DynamicLevelSwitch) {
            const switchStage = new DynamicLevelSwitchStage(levelOrSwitch);
            const flush = this._pipeline.flush;
            switchStage.setFlushDelegate(() => this._pipeline.flush());
            this._pipeline.addStage(switchStage);
            return this;
        } else if (typeof levelOrSwitch === 'string') {
            const level = <LogEventLevel>LogEventLevel[levelOrSwitch.toLowerCase()];
            if (typeof level === 'undefined' || level === null) {
                throw new TypeError('Argument "levelOrSwitch" is not a valid LogEventLevel value.');
            }
            return this.filter(e => isEnabled(level, e.level));
        } else {
            return this.filter(e => isEnabled(levelOrSwitch, e.level));
        }
    }, {
        fatal: () => this.minLevel(LogEventLevel.fatal),
        error: () => this.minLevel(LogEventLevel.error),
        warning: () => this.minLevel(LogEventLevel.warning),
        information: () => this.minLevel(LogEventLevel.information),
        debug: () => this.minLevel(LogEventLevel.debug),
        verbose: () => this.minLevel(LogEventLevel.verbose)
    });

    /**
     * Adds a filter to the pipeline.
     * @param {(e: LogEvent) => boolean} predicate Filter predicate to use.
     */
    filter(predicate: (e: LogEvent) => boolean): LoggerConfiguration {
        if (predicate instanceof Function) {
            this._pipeline.addStage(new FilterStage(predicate));
        } else {
            throw new TypeError('Argument "predicate" must be a function.');
        }
        return this;
    }

    /**
     * Adds an enricher to the pipeline.
     */
    enrich(enricher: Object | ObjectFactory): LoggerConfiguration {
        if (enricher instanceof Function || enricher instanceof Object) {
            this._pipeline.addStage(new EnrichStage(enricher));
        } else {
            throw new TypeError('Argument "enricher" must be either a function or an object.');
        }

        return this;
    }

    /**
     * Enable or disable error suppression.
     */
    suppressErrors(suppress?: boolean): LoggerConfiguration {
        this._suppressErrors = typeof suppress === 'undefined' || suppress;
        return this;
    }

    /**
     * 
     * @param config 
     * @param keyName 
     * @returns 
     */
    readFromConfiguration(config: Object, keyName: string = 'serilogger'): LoggerConfiguration {
        if (config === null || config === undefined) throw new TypeError('Argument "config" cannot be null or undefined');
        if (!config[keyName]) throw new TypeError(`Argument "config" must contain a property of "${keyName}"`);

        config = config[keyName];

        if (!config["writeTo"]) throw new TypeError('Argument "config" must contain a sub-property of "writeTo"');
        if (!(config["writeTo"] instanceof Array)) throw new TypeError('"writeTo" property must be an Array');
        if ((config["writeTo"] as Array<any>).length === 0) throw new TypeError('"writeTo" property must have at least one element');

        const writeToItems = config["writeTo"] as Array<any>;

        for (let item of writeToItems) {
            if (!item["name"]) continue;
            switch (item["name"].toLowerCase()) {
                case 'console':
                    this._pipeline.addStage(new SinkStage(new ConsoleSink(item['args'] ?? null)));
                    break;
                case 'coloredconsole':
                    this._pipeline.addStage(new SinkStage(new ColoredConsoleSink(item['args'] ?? null)));
                    break;
                case 'seq':
                    if (!item['args']) throw new TypeError('Seq sink requires input arguments');
                    this._pipeline.addStage(new SinkStage(new SeqSink(item['args'])));
                    break;
                default:
                    throw new TypeError(`Unknown WriteTo Type: ${item['name']}`);
            }
        }

        return this;
    }

    /**
     * Creates a new logger instance based on this configuration.
     */
    create(): Logger {
        return new Logger(this._pipeline, this._suppressErrors);
    }
}
