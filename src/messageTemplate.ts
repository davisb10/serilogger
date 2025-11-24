const tokenizer = /\{(@?[^}:]+)(?:\:([^}]+))?\}/g;

interface Token {
	name?: string | undefined;
	text?: string | undefined;
	destructure?: boolean | undefined;
	format?: string | undefined;
	rendering?: Rendering | undefined;
	raw?: string | undefined;
}

interface Rendering {
	format: string;
	rendered?: string | undefined;
}

/**
 * Represents a message template that can be rendered into a log message.
 */
export class MessageTemplate {
	/**
	 * Gets or sets the raw message template of this instance.
	 */
	raw: string;

	/**
	 * Get or sets the JSON template string max length. Set to -1 for no max.
	 */
	jsonTemplateStringMaxLength = 70;

	private readonly tokens: Token[];

	/**
	 * Creates a new MessageTemplate instance with the given template.
	 */
	constructor(messageTemplate: string) {
		if (messageTemplate === null || !messageTemplate.length) {
			throw new Error('Argument "messageTemplate" is required.');
		}

		this.raw = messageTemplate;
		this.tokens = this.tokenize(messageTemplate);
	}

	/**
	 * Renders this template using the given properties.
	 * @param {Object} properties Object containing the properties.
	 * @returns Rendered message.
	 */
	render(properties?: Object): string {
		if (!this.tokens.length) {
			return this.raw;
		}
		properties = properties || {};
		// handle compact '@r' array which contains renderings in order
		const compactRenderings: any[] | undefined = (properties as any)['@r'];
		let compactIndex = 0;
		const result = [];
		for (let i = 0; i < this.tokens.length; ++i) {
			const token = this.tokens[i];
			if (typeof token.name === 'string') {
				// If there is a format and a rendering available, prefer that
				if (token.format) {
					// Grab value from properties, if available, based on token name
					let propertyValue = (properties as any)[token.name];

					// If no property value, just use the raw token
					if (typeof propertyValue === 'undefined') {
						result.push(token.raw);
						continue;
					}

					// Add rendering based on the format
					if (token.rendering && token.rendering.format) {
						token.rendering.rendered = this.generateRendering(propertyValue, token.rendering.format);
						result.push(token.rendering.rendered!);
						continue;
					}
				}

				if (properties.hasOwnProperty(token.name)) {
					result.push(this.toText((properties as any)[token.name]));
				} else {
					result.push(token.raw);
				}
			} else {
				result.push(token.text);
			}
		}
		return result.join('');
	}

	/**
	 * Binds the given set of args to their matching tokens.
	 * @param {any} positionalArgs Arguments.
	 * @returns Object containing the properties.
	 */
	bindProperties(positionalArgs: any): Object {
		const result = {};
		let nextArg = 0;
		for (let i = 0; i < this.tokens.length && nextArg < positionalArgs.length; ++i) {
			const token = this.tokens[i];
			if (typeof token.name === 'string') {
				let p = positionalArgs[nextArg];
				result[token.name] = this.capture(p, token.destructure);
				nextArg++;
			}
		}

		while (nextArg < positionalArgs.length) {
			const arg = positionalArgs[nextArg];
			if (typeof arg !== 'undefined') {
				result['a' + nextArg] = this.capture(arg);
			}
			nextArg++;
		}

		return result;
	}

	getRenderings(): { [key: string]: Rendering } {
		const renderings: { [key: string]: Rendering } = {};
		for (let i = 0; i < this.tokens.length; ++i) {
			const token = this.tokens[i];
			if (typeof token.name === 'string' && token.format) {
				renderings[token.name] = token.rendering!;
			}
		}
		return renderings;
	}

	getRenderingsCompact(): string[] {
		const renderings: string[] = [];
		for (let i = 0; i < this.tokens.length; ++i) {
			const token = this.tokens[i];
			if (typeof token.name === 'string' && token.format && token.rendering) {
				renderings.push(token.rendering.rendered!);
			}
		}
		return renderings;
	}

	private tokenize(template: string): Token[] {
		const tokens = [];

		let result: RegExpExecArray | null;
		let textStart = 0;

		while ((result = tokenizer.exec(template)) !== null) {
			if (result.index !== textStart) {
				tokens.push({ text: template.slice(textStart, result.index) });
			}

			let destructure = false;
			let name = result[1];
			const format = result[2];

			if (name.indexOf('@') === 0) {
				name = name.slice(1);
				destructure = true;
			}

			tokens.push({
				name: name,
				destructure,
				format: typeof format === 'string' ? format : undefined,
				rendering: typeof format === 'string' ? { format: format, rendered: '' } : undefined,
				raw: result[0]
			});

			textStart = tokenizer.lastIndex;
		}

		if (textStart >= 0 && textStart < template.length) {
			tokens.push({ text: template.slice(textStart) });
		}

		return tokens;
	}

	private toText(property: any): string {
		if (typeof property === 'undefined') return 'undefined';
		if (property === null) return 'null';
		if (typeof property === 'string') return property;
		if (typeof property === 'number') return property.toString();
		if (typeof property === 'boolean') return property.toString();
		if (typeof property.toISOString === 'function') return property.toISOString();

		if (typeof property === 'object') {
			let s = JSON.stringify(property);

			if (this.jsonTemplateStringMaxLength === -1) return s;

			if (s.length > this.jsonTemplateStringMaxLength) {
				s = s.slice(0, 67) + '...';
			}

			return s;
		}

		return property.toString();
	};

	private generateRendering(property: any, format: string): string {
		if (typeof property === 'undefined') return 'undefined';
		if (property === null) return 'null';

		// switch based on the first character of the format
		switch (format.charAt(0)) {
			case 'x': // hexadecimal
				if (typeof property === 'number') {
					const hex = property.toString(16);

					// pad with leading zeros if width specified
					if (format.length > 1) {
						const width = parseInt(format.slice(1), 10);
						return hex.padStart(width, '0');
					}
					return hex;
				}
				break;
			case 'p': // percent
				if (typeof property === 'number') {
					// Round based on number of decimal places specified
					if (format.length > 1) {
						const decimals = parseInt(format.slice(1), 10);
						return (property * 100).toFixed(decimals) + '%';
					}
					return (property * 100).toString() + '%';
				}
				break;
			case 'u': // uppercase
				return this.toText(property).toUpperCase();
			case 'l': // lowercase
				return this.toText(property).toLowerCase();
			default:
				return this.toText(property);
		}
	}

	private capture(property: any, destructure?: boolean): Object {
		if (typeof property === 'function') {
			return property.toString();
		}

		if (typeof property === 'object') {
			// null value will be automatically stringified as "null", in properties it will be as null
			// otherwise it will throw an error
			if (property === null) {
				return property;
			}

			// Could use instanceof Date, but this way will be kinder
			// to values passed from other contexts...
			if (destructure || typeof property.toISOString === 'function') {
				return property;
			}

			return property.toString();
		}

		return property;
	}

	/**
	 * Compute and return a 32-bit hash of the provided messageTemplate. The
	 * resulting hash value can be uses as an event id in lieu of transmitting the
	 * full template string.
	 */
	public computeEventId(): number {
		// Jenkins one-at-a-time https://en.wikipedia.org/wiki/Jenkins_hash_function
		let hash: number = 0;
		for (var i = 0; i < this.raw.length; ++i) {
			hash += this.raw.charCodeAt(i);
			hash += (hash << 10);
			hash ^= (hash >> 6);
		}
		hash += (hash << 3);
		hash ^= (hash >> 11);
		hash += (hash << 15);

		return hash;
	}
}
