/// <reference path="../node_modules/@types/jest/index.d.ts" />

import { MessageTemplate } from '../src/messageTemplate';

describe('MessageTemplate', () => {
	describe('constructor()', () => {
		it('requires a message', () => {
			expect(() => new MessageTemplate(null)).toThrow();
		});
	});

	describe('bindProperties()', () => {
		it('binds properties from arguments', () => {
			let boundProperties;
			((...properties: any[]) => {
				const messageTemplate = new MessageTemplate('Happy {age}th birthday, {name}!');
				boundProperties = messageTemplate.bindProperties(properties);
			})(30, 'Fred');
			expect(boundProperties).toHaveProperty('age', 30);
			expect(boundProperties).toHaveProperty('name', 'Fred');
		});

		it('destructures bound properties from arguments', () => {
			let boundProperties;
			((...properties: any[]) => {
				const messageTemplate = new MessageTemplate('Hello, {@person}!');
				boundProperties = messageTemplate.bindProperties(properties);
			})({ firstName: 'Leeroy', lastName: 'Jenkins' });
			expect(boundProperties).toHaveProperty('person.firstName', 'Leeroy');
			expect(boundProperties).toHaveProperty('person.lastName', 'Jenkins');
		});

		it('binds properties not in the message template', () => {
			let boundProperties;
			const f = function () {
			};
			const o = null;
			((...properties: any[]) => {
				const messageTemplate = new MessageTemplate('Happy {age}th birthday, {name}!');
				boundProperties = messageTemplate.bindProperties(properties);
			})(30, 'Fred', undefined, 'Not in template', f, o, {});
			expect(boundProperties).toHaveProperty('age', 30);
			expect(boundProperties).toHaveProperty('name', 'Fred');
			expect(boundProperties).toHaveProperty('a3', 'Not in template');
			expect(boundProperties).toHaveProperty('a4', f.toString());
			expect(boundProperties).toHaveProperty('a5', null);
			expect(boundProperties).toHaveProperty('a6', {}.toString());
		});
	});

	describe('render()', () => {
		it('renders a message', () => {
			const messageTemplate = new MessageTemplate('Happy {age}th birthday, {name}!');
			const message = messageTemplate.render({ age: 30, name: 'Fred' });

			expect(message).toEqual('Happy 30th birthday, Fred!');
		});

		it('renders a message without any parameters', () => {
			const messageTemplate = new MessageTemplate('Happy 30th birthday, Fred!');
			const message = messageTemplate.render();

			expect(message).toEqual('Happy 30th birthday, Fred!');
		});

		it('renders a message with destructured parameters', () => {
			const messageTemplate = new MessageTemplate('Hello, {@person}!');
			const message = messageTemplate.render({ person: { firstName: 'Leeroy', lastName: 'Jenkins' } });

			expect(message).toEqual('Hello, {"firstName":"Leeroy","lastName":"Jenkins"}!');
		});

		it('renders a message with missing properties', () => {
			const messageTemplate = new MessageTemplate('Hello, {@person}!');
			const message = messageTemplate.render();

			expect(message).toEqual('Hello, {@person}!');
		});

		it('renders string representations of primitive properties', () => {
			const messageTemplate = new MessageTemplate('{p}');
			expect(messageTemplate.render({ p: undefined })).toEqual('undefined');
			expect(messageTemplate.render({ p: null })).toEqual('null');
			expect(messageTemplate.render({ p: 'text' })).toEqual('text');
			expect(messageTemplate.render({ p: 123 })).toEqual('123');
			expect(messageTemplate.render({ p: true })).toEqual(true.toString());
		});

		it('renders string representations of complex properties', () => {
			const messageTemplate = new MessageTemplate('{p}');
			const date = new Date();
			expect(messageTemplate.render({ p: date })).toEqual(date.toISOString());
			const complex = {
				aaaa: {
					bbbb: {
						cccc: {
							dddd: 'eeee'
						}
					},
					ffff: {
						gggg: {
							hhhh: {
								ijkl: 'mnopqrstuvwxyz'
							}
						}
					}
				}
			};
			const complexMessage = messageTemplate.render({ p: complex });
			expect(complexMessage).toHaveLength(70);
			expect(complexMessage.indexOf('...')).toEqual(67);
			expect(messageTemplate.render({ p: Symbol('sym') })).toEqual('Symbol(sym)');
			const f = function () {
			};
			expect(messageTemplate.render({ p: f })).toEqual(f.toString());
		});

		it('uses Renderings object for formatted tokens - hexadecimal', () => {
			const messageTemplate = new MessageTemplate('Value = {N:x}');
			const props: any = { N: 123 };
			expect(messageTemplate.render(props)).toEqual('Value = 7b');
		});

		it('uses Renderings object for formatted tokens - hexadecimal (padded)', () => {
			const messageTemplate = new MessageTemplate('Value = {N:x8}');
			const props: any = { N: 123 };
			expect(messageTemplate.render(props)).toEqual('Value = 0000007b');
		});

		it('uses Renderings object for formatted tokens - percent (direct)', () => {
			const messageTemplate = new MessageTemplate('Value = {N:p2}');
			const props: any = { N: 0.1234 };
			expect(messageTemplate.render(props)).toEqual('Value = 12.34%');
		});

		it('uses Renderings object for formatted tokens - percent (rounded)', () => {
			const messageTemplate = new MessageTemplate('Value = {N:p2}');
			const props: any = { N: 0.12346 };
			expect(messageTemplate.render(props)).toEqual('Value = 12.35%');
		});

		it('uses Renderings object for formatted tokens - uppercase', () => {
			const messageTemplate = new MessageTemplate('Value = {N:u}');
			const props: any = { N: 'abcdefg' };
			expect(messageTemplate.render(props)).toEqual('Value = ABCDEFG');
		});

		it('uses Renderings object for formatted tokens - lowercase', () => {
			const messageTemplate = new MessageTemplate('Value = {N:l}');
			const props: any = { N: 'ABCDEFG' };
			expect(messageTemplate.render(props)).toEqual('Value = abcdefg');
		});
	});

	describe('computeEventId()', () => {
		it('computes a stable event ID for the message template', () => {
			const mt1 = new MessageTemplate('Hello, {name}!');
			const mt2 = new MessageTemplate('Hello, {name}!');
			const mt3 = new MessageTemplate('Goodbye, {name}.');

			expect(mt1.computeEventId()).toEqual(mt2.computeEventId());
			expect(mt1.computeEventId()).not.toEqual(mt3.computeEventId());
		});
	});
});
