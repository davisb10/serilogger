import { DynamicLevelSwitch } from './dynamicLevelSwitch';
import { SeqSink } from './seqSink';

export interface APISinkOptions {
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

export class APISink extends SeqSink {
    headers: {[key: string]: string} = null;

    constructor(options: APISinkOptions) {
        let seqOptions = {
            apiKey: "",
            compact: options.compact || false,
            durable: options.durable || false,
            levelSwitch: options.levelSwitch,
            suppressErrors: options.suppressErrors || true,
            url: options.url
        };
        super(seqOptions);

        if (this.headers !== null) {
            this.headers = options.headers;
        }
    }

    public toString() {
        return 'APISink';
    }

    protected postToLogger(url: any, apiKey: any, compact: boolean, body: any) {
        const promise = fetch(`${url}`, {
            headers: this.headers || {},
            method: 'POST',
            body
        });

        return promise;
    }

    protected logSuppressedError(reason: string) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('Suppressed error when logging to API: ' + reason);
        }
    }
}