import { expect } from 'chai';
import { LoggerConfiguration } from '../src/loggerConfiguration';
import * as serilogger from '../src/index';

describe('configure()', () => {
    it('returns a new LoggerConfiguration instance', () => {
        const loggerConfiguration = serilogger.configure();
        expect(loggerConfiguration).to.be.an.instanceof(LoggerConfiguration);
    });
});