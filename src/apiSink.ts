import { DynamicLevelSwitch } from './dynamicLevelSwitch';
import { LogEventLevel, LogEvent } from './logEvent';
import { Sink } from './sink';

export interface ApiSinkOptions {
    /**
     * If true, events be serialized using Serilog's compact format
     */
    compact?: boolean;

    /**
     * If true, events will be buffered in local storage if available
     */
    durable?: boolean;

    /**
     * DynamicLevelSwitch which the Seq log level will control and use
     */
    levelSwitch?: DynamicLevelSwitch;

    /**
     * If true, errors in the pipeline will be suppressed and logged to the console instead (defaults to true)
     */
    suppressErrors?: boolean;

    /**
     * URL of the API
     */
    url: string;

    /**
     * Custom headers to be sent with the request
     */
    headers?: {[key: string]: string};
}

export class ApiSink implements Sink {

    url: string = null;
    headers: {[key: string]: string} = null;
    durable: boolean = false;
    compact: boolean = false;
    levelSwitch: DynamicLevelSwitch = null;
    refreshLevelSwitchTimeoutId = null;
    refreshLevelSwitchTimeoutInterval = 2 * 60 * 1000;
    suppressErrors = true;

    constructor(options: ApiSinkOptions) {
        if (!options) {
            throw new Error(`'options' parameter is required.`);
        }
        if (!options.url || options.url === '') {
            throw new Error(`'options.url' parameter is required.`);
        }

        this.url = options.url.replace(/\/$/, '');
        this.levelSwitch = options.levelSwitch || null;
        this.suppressErrors = options.suppressErrors !== false;

        if (options.durable && typeof localStorage === 'undefined') {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(`'options.durable' parameter was set to true, but 'localStorage' is not available.`);
            }
            this.durable = false;
        } else {
            this.durable = !!options.durable;
        }

        this.compact = !!options.compact;

        if (this.durable) {
            const requests = {};
            for (let i = 0; i < localStorage.length; ++i) {
                const storageKey = localStorage.key(i);
                if (storageKey.indexOf('serilogger-' + this.toString()) !== 0) {
                    continue;
                }

                const body = localStorage.getItem(storageKey);
                requests[storageKey] = this.postToLogger(this.url, body)
                    .then(() => localStorage.removeItem(storageKey))
                    .catch(reason => {
                        if (this.suppressErrors) this.logSuppressedError(reason); 
                        throw new Error(reason);
                    });
            }
        }

        if (this.levelSwitch !== null) {
            this.refreshLevelSwitchTimeoutId = setTimeout(() => this.sendToServer([]), this.refreshLevelSwitchTimeoutInterval);
        }

        if (this.headers !== null) {
            this.headers = options.headers;
        }
    }

    public toString() {
        return 'ApiSink';
    }

    public emit(events: LogEvent[]) {
        var filteredEvents = this.levelSwitch
            ? events.filter(e => this.levelSwitch.isEnabled(e.level))
            : events;

        if (!filteredEvents.length) {
            return Promise.resolve();
        }

        return this.sendToServer(filteredEvents);
    }

    public flush() {
        return Promise.resolve();
    }

    private async sendToServer(events: LogEvent[]) {
        const seqEvents = this.compact ? events.reduce((s, e) => {
            const mappedEvent = {
                '@l': this.mapLogLevel(e.level),
                '@mt': e.messageTemplate.raw,
                '@t': e.timestamp,
                ...e.properties
            };
            if (e.error instanceof Error && e.error.stack) {
                mappedEvent['@x'] = e.error.stack;
            }
            return `${s}${JSON.stringify(mappedEvent)}\n`;
        }, '').replace(/\s+$/g, '') : events.map(e => {
            const mappedEvent = {
                Level: this.mapLogLevel(e.level),
                MessageTemplate: e.messageTemplate.raw,
                Properties: e.properties,
                Timestamp: e.timestamp
            };
            if (e.error instanceof Error && e.error.stack) {
                mappedEvent['Exception'] = e.error.stack;
            }
            return mappedEvent;
        });

        const body: any = this.compact ? seqEvents : JSON.stringify({
            Events: seqEvents
        });

        let storageKey: string;
        if (this.durable) {
            storageKey = `serilogger-${this.toString()}-${new Date().getTime()}-${Math.floor(Math.random() * 1000000) + 1}`;
            localStorage.setItem(storageKey, body);
        }

        try {
            const response = await this.postToLogger(this.url, body);
            const json = await response.json();
            this.updateLogLevel(json);
            if (storageKey)
                localStorage.removeItem(storageKey);
        }
        catch (reason) {
            return this.suppressErrors ? this.logSuppressedError(reason) : Promise.reject(reason);
        }
    }

    private updateLogLevel(response: { MinimumLevelAccepted: any; }) {
        if (!this.levelSwitch) return;

        if (this.refreshLevelSwitchTimeoutId) {
            clearTimeout(this.refreshLevelSwitchTimeoutId);
            this.refreshLevelSwitchTimeoutId = setTimeout(() => this.sendToServer([]), this.refreshLevelSwitchTimeoutInterval);
        }

        if (response && response.MinimumLevelAccepted) {
            switch (response.MinimumLevelAccepted) {
                case 'Fatal':
                    this.levelSwitch.fatal();
                    break;
                case 'Error':
                    this.levelSwitch.error();
                    break;
                case 'Warning':
                    this.levelSwitch.warning();
                    break;
                case 'Information':
                    this.levelSwitch.information();
                    break;
                case 'Debug':
                    this.levelSwitch.debug();
                    break;
                case 'Verbose':
                    this.levelSwitch.verbose();
                    break;
            }
        }
    }

    private logSuppressedError(reason: string) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('Suppressed error when logging to ' + this.toString() + ': ' + reason);
        }
    }

    private mapLogLevel(logLevel: number | LogEventLevel) {
        if (logLevel === 1) {
            return 'Fatal'
        } else if (logLevel === 3) {
            return 'Error';
        } else if (logLevel === 7) {
            return 'Warning';
        } else if (logLevel === 31) {
            return 'Debug';
        } else if (logLevel === 63) {
            return 'Verbose';
        }

        // Default to Information.
        return 'Information';
    }

    protected postToLogger(url: any, body: any) {
        const promise = fetch(`${url}`, {
            headers: this.headers || {},
            method: 'POST',
            body
        });

        return promise;
    }
}