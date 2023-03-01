import { DynamicLevelSwitch } from './dynamicLevelSwitch';
import { ApiSink, ApiSinkOptions } from './apiSink';

export interface SeqSinkOptions {
    /**
     * API key to use
     */
    apiKey?: string;

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
     * URL to the Seq server
     */
    url: string;
}

export class SeqSink extends ApiSink  {
    
    apiKey: string = null;

    constructor(options: SeqSinkOptions) {
        super({
            compact: options.compact || false,
            durable: options.durable || false,
            levelSwitch: options.levelSwitch,
            suppressErrors: options.suppressErrors || true,
            url: options.url,
            headers: null
        });

        this.apiKey = options.apiKey;
    }

    public toString() {
        return 'SeqSink';
    }

    protected postToLogger(url: any, body: any) {
        const apiKeyParameter = this.apiKey ? `?apiKey=${this.apiKey}` : '';
        const promise = fetch(`${url}/api/events/raw${apiKeyParameter}`, {
            headers: {
                'content-type': this.compact ? 'application/vnd.serilog.clef' : 'application/json'
            },
            method: 'POST',
            body
        });

        return promise;
    }
}