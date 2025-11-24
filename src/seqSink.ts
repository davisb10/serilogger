import { ApiSink } from './apiSink';
import { DynamicLevelSwitch } from './dynamicLevelSwitch';

export interface SeqSinkOptions {
	/**
	 * API key to use
	 */
	apiKey?: string;

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
	 * If true, event IDs will be included in the logged events
	 */
	includeEventId?: boolean;

	/**
	 * URL to the Seq server
	 */
	url: string;
}

export class SeqSink extends ApiSink {

	apiKey: string = null;

	constructor(options: SeqSinkOptions) {
		super({
			compact: true,
			durable: options.durable || false,
			includeEventId: options.includeEventId || false,
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
		const promise = fetch(`${url}/ingest/clef${apiKeyParameter}`, {
			headers: {
				'content-type': 'application/vnd.serilog.clef'
			},
			method: 'POST',
			body
		});

		return promise;
	}
}