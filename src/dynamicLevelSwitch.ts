import {LogEventLevel, LogEventLevelSwitch, isEnabled} from './logEvent';
import {FilterStage} from './filterStage';

/**
 * Allows dynamic control of the logging level.
 */
export class DynamicLevelSwitch implements LogEventLevelSwitch<Promise<any>> {
    private minLevel: LogEventLevel | null = null;

    /**
     * Gets or sets a delegate that can be called when the pipeline needs to be flushed.
     * This should generally not be modified, as it will be provided by the pipeline stage.
     */
    flushDelegate: () => Promise<any> = () => Promise.resolve();

    async fatal() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.fatal;
    }

    async error() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.error;
    }

    async warning() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.warning;
    }

    async information() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.information;
    }

    async debug() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.debug;
    }

    async verbose() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.verbose;
    }

    async off() {
        await this.flushDelegate();
        return this.minLevel = LogEventLevel.off;
    }

    isEnabled(level: LogEventLevel): boolean {
        return this.minLevel === null || isEnabled(this.minLevel, level);
    }
}

export class DynamicLevelSwitchStage extends FilterStage {
    private dynamicLevelSwitch: DynamicLevelSwitch;

    /**
     * Sets a delegate that can be called when the pipeline needs to be flushed.
     */
    setFlushDelegate(flushDelegate: () => Promise<any>) {
        this.dynamicLevelSwitch.flushDelegate = flushDelegate;
    }

    constructor(dynamicLevelSwitch: DynamicLevelSwitch) {
        super(e => dynamicLevelSwitch.isEnabled(e.level));
        this.dynamicLevelSwitch = dynamicLevelSwitch;
    }
}
