const tokenizer = /\{(@?[^}:]+)(?:\:([^}]+))?\}/g;

interface Token {
    name?: string;
    text?: string;
    destructure?: boolean;
    format?: string;
    raw?: string;
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
                    // compact renderings (@r) are positional
                    if (Array.isArray(compactRenderings) && compactIndex < compactRenderings.length) {
                        result.push(compactRenderings[compactIndex++]);
                        continue;
                    }

                    // JsonFormatter 'Renderings' property - map by token name
                    const renderings = (properties as any)['Renderings'];
                    if (renderings && renderings[token.name] && Array.isArray(renderings[token.name])) {
                        const matches = (renderings[token.name] as any[]).filter(r => !r.Format || r.Format === token.format);
                        if (matches.length) {
                            result.push(matches[0].Rendering);
                            continue;
                        }
                        // fallback to first rendering
                        if ((renderings[token.name] as any[]).length) {
                            result.push((renderings[token.name] as any[])[0].Rendering);
                            continue;
                        }
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

    private tokenize(template: string): Token[] {
        const tokens = [];

        let result: RegExpExecArray | null;
        let textStart = 0;

        while ((result = tokenizer.exec(template)) !== null) {
            if (result.index !== textStart) {
                tokens.push({text: template.slice(textStart, result.index)});
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
                raw: result[0]
            });

            textStart = tokenizer.lastIndex;
        }

        if (textStart >= 0 && textStart < template.length) {
            tokens.push({text: template.slice(textStart)});
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
}
