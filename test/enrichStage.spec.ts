/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/jest/index.d.ts" />
/// <reference path="../node_modules/typemoq/dist/typemoq.d.ts" />

import { expect } from 'chai';
import { LogEvent, LogEventLevel } from '../src/logEvent';
import { MessageTemplate } from '../src/messageTemplate';
import { EnrichStage } from '../src/enrichStage';

describe('EnrichStage', () => {
    it('enriches events with properties returned from a function', () => {
        const enricher = () => ({ b: 2 });
        const enrichStage = new EnrichStage(enricher);
        const events = [
            new LogEvent('', LogEventLevel.information, new MessageTemplate('Message 1'), { a: 1 }),
            new LogEvent('', LogEventLevel.information, new MessageTemplate('Message 2'), { a: 1 })
        ];
        const enrichedEvents = enrichStage.emit(events);
        expect(enrichedEvents).to.have.length(2);
        expect(enrichedEvents[0]).to.have.nested.property('properties.b', 2);
        expect(enrichedEvents[1]).to.have.nested.property('properties.b', 2);
    });

    it('passes the event properties to the enricher to allow conditional masking', () => {
        const extraParams = { url: 'testUrl2'};
        const enricher = (properties) => {
            return {
                password: 'REDACTED',
                url: properties.url,
                url2: extraParams.url
            };
        };
        const enrichStage = new EnrichStage(enricher);
        const events = [
            new LogEvent('', LogEventLevel.information, new MessageTemplate('Message 1'), { a: 1, password: 'secret', url: 'testUrl' }),
        ];
        const enrichedEvents = enrichStage.emit(events);
        expect(enrichedEvents).to.have.length(1);
        expect(enrichedEvents[0]).to.have.nested.property('properties.password', 'REDACTED');
        expect(enrichedEvents[0]).to.have.nested.property('properties.a', 1);
        expect(enrichedEvents[0]).to.have.nested.property('properties.url', 'testUrl');
        expect(enrichedEvents[0]).to.have.nested.property('properties.url2', 'testUrl2');
    });

    it('does not allow direct manipulation of the event properties', () => {
        const enricherParams = [];
        const enricher = (properties) => {
            delete properties.password;
        };
        const enrichStage = new EnrichStage(enricher);
        const events = [
            new LogEvent('', LogEventLevel.information, new MessageTemplate('Message 1'), { password: 'secret' }),
        ];
        const enrichedEvents = enrichStage.emit(events);
        expect(enrichedEvents).to.have.length(1);
        expect(enrichedEvents[0]).to.have.nested.property('properties.password', 'secret');
    });

    it('enriches events with properties from a plain object', () => {
        const enricher = { b: 2 };
        const enrichStage = new EnrichStage(enricher);
        const events = [
            new LogEvent('', LogEventLevel.information, new MessageTemplate('Message 1'), { a: 1 }),
            new LogEvent('', LogEventLevel.information, new MessageTemplate('Message 2'), { a: 1 })
        ];
        const enrichedEvents = enrichStage.emit(events);
        expect(enrichedEvents).to.have.length(2);
        expect(enrichedEvents[0]).to.have.nested.property('properties.b', 2);
        expect(enrichedEvents[1]).to.have.nested.property('properties.b', 2);
    });

    it('does nothing when flushed', () => {
        return new EnrichStage({}).flush();
    });
});
