/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/jest/index.d.ts" />
/// <reference path="../node_modules/typemoq/dist/typemoq.d.ts" />

import { expect } from 'chai';
import * as TypeMoq from 'typemoq';
import { LoggerConfiguration } from '../src/loggerConfiguration';
import { Logger } from '../src/logger';
import { LogEventLevel } from '../src/logEvent';
import { DynamicLevelSwitch } from '../src/dynamicLevelSwitch';
// @ts-ignore
import { ConcreteSink } from './helpers';
import { Pipeline, PipelineStage } from '../src/pipeline';
import { ConsoleSink, defaultConsoleSinkOptions } from '../src/consoleSink';
import { SinkStage } from '../src/sink';

describe('LoggerConfiguration', () => {
    describe('create()', () => {
        it('creates a new logger instance', () => {
            const loggerConfiguration = new LoggerConfiguration();
            const logger = loggerConfiguration.create();
            expect(logger).to.be.instanceof(Logger);
        });
    });

    describe('readFromConfiguration()', () => {
        it('requires a valid configuration object', () => {
            let loggerConfiguration = new LoggerConfiguration();
            const invalidBaseName = {
                invalid: {}
            };
            expect(() => loggerConfiguration.readFromConfiguration(invalidBaseName)).to.throw('Argument "config" must contain a property of "serilogger"');

            const invalidProperty = {
                serilogger: {
                    badProperty: []
                }
            };
            expect(() => loggerConfiguration.readFromConfiguration(invalidProperty)).to.throw('Argument "config" must contain a sub-property of "writeTo"');

            const writeToNotAnArray = {
                serilogger: {
                    writeTo: 'INVALID'
                }
            };
            expect(() => loggerConfiguration.readFromConfiguration(writeToNotAnArray)).to.throw('"writeTo" property must be an Array');

            const writeToArrayEmpty = {
                serilogger: {
                    writeTo: []
                }
            };
            expect(() => loggerConfiguration.readFromConfiguration(writeToArrayEmpty)).to.throw('"writeTo" property must have at least one element');
        });

        it('adds a base ConsoleSink', () => {
            let loggerConfiguration = new LoggerConfiguration();
            const config = {
                serilogger: {
                    writeTo: [
                        {
                            name: 'Console'
                        }
                    ]
                }
            };
            loggerConfiguration = loggerConfiguration.readFromConfiguration(config);
            const sinks: PipelineStage[] = loggerConfiguration['_sinks'];
            expect(sinks.length).to.equal(1);
            const consoleSink = (sinks as SinkStage[])[0]['sink'] as ConsoleSink;

            expect(consoleSink['options'].includeProperties).to.equal(defaultConsoleSinkOptions.includeProperties);
            expect(consoleSink['options'].includeTimestamps).to.equal(defaultConsoleSinkOptions.includeTimestamps);
            expect(consoleSink['options'].removeLogLevelPrefix).to.equal(defaultConsoleSinkOptions.removeLogLevelPrefix);
        });

        it('adds a configured ConsoleSink', () => {
            let loggerConfiguration = new LoggerConfiguration();
            const config = {
                serilogger: {
                    writeTo: [
                        {
                            name: 'Console',
                            args: {
                                removeLogLevelPrefix: true,
                                includeTimestamps: true,
                                includeProperties: true
                            }
                        }
                    ]
                }
            };
            loggerConfiguration = loggerConfiguration.readFromConfiguration(config);
            const sinks: PipelineStage[] = loggerConfiguration['_sinks'];
            expect(sinks.length).to.equal(1);
            const consoleSink = (sinks as SinkStage[])[0]['sink'] as ConsoleSink;

            expect(consoleSink['options'].includeProperties).to.equal(true);
            expect(consoleSink['options'].includeTimestamps).to.equal(true);
            expect(consoleSink['options'].removeLogLevelPrefix).to.equal(true);
        });
    });

    describe('enrich()', () => {
        it('adds an enricher to the pipeline', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .enrich({ c: 3 })
                .enrich(() => ({ d: 4 }))
                .writeTo(sink.object)
                .create();

            logger.info('C is the third letter');

            return logger.flush().then(() => {
                expect(emittedEvents[0]).to.have.nested.property('properties.c', 3);
                expect(emittedEvents[0]).to.have.nested.property('properties.d', 4);
            });
        });

        it('requires an enricher to be provided', () => {
            const loggerConfiguration = new LoggerConfiguration();
            expect(() => loggerConfiguration.enrich(undefined)).to.throw();
            expect(() => loggerConfiguration.enrich(null)).to.throw();
        });
    });

    describe('filter()', () => {
        it('adds a filter to the pipeline', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .filter(e => e.messageTemplate.raw.indexOf('C') === 0)
                .writeTo(sink.object)
                .create();

            logger.info('A is the first letter');
            logger.info('B is the second letter');
            logger.info('C is the third letter');
            logger.info('D is the fourth letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(1);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'C is the third letter');
            });
        });

        it('requires a filter to be provided', () => {
            const loggerConfiguration = new LoggerConfiguration();
            expect(() => loggerConfiguration.filter(undefined)).to.throw();
            expect(() => loggerConfiguration.filter(null)).to.throw();
        });
    });

    describe('minLevel()', () => {
        it('throws if no level or switch is provided', () => {
            const loggerConfiguration = new LoggerConfiguration();
            expect(() => loggerConfiguration.minLevel(undefined)).to.throw();
            expect(() => loggerConfiguration.minLevel(null)).to.throw();
        });

        it('sets the minimum level', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel(LogEventLevel.debug)
                .writeTo(sink.object)
                .create();

            logger.fatal('A is the first letter');
            logger.verbose('B is the second letter');
            logger.info('C is the third letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(2);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'A is the first letter');
                expect(emittedEvents[1]).to.have.nested.property('messageTemplate.raw', 'C is the third letter');
            });
        });

        it('sets the minimum by bit flags', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel(23)
                .writeTo(sink.object)
                .create();

            logger.error('A is the first letter');
            logger.info('B is the second letter');
            logger.debug('C is the third letter');
            logger.warn('D is the fourth letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(2);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'A is the first letter');
                expect(emittedEvents[1]).to.have.nested.property('messageTemplate.raw', 'D is the fourth letter');
            });
        });

        it('sets the minimum level by label (case-insensitive)', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel('WaRninG')
                .writeTo(sink.object)
                .create();

            logger.fatal('A is the first letter');
            logger.warn('B is the second letter');
            logger.info('C is the third letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(2);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'A is the first letter');
                expect(emittedEvents[1]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });

        it('throws if an invalid label is provided', () => {
            const loggerConfiguration = new LoggerConfiguration();
            expect(() => loggerConfiguration.minLevel('oogabooga')).to.throw();
        });

        it('sets the specified dynamic switch', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const dynamicLevelSwitch = new DynamicLevelSwitch();
            const logger = new LoggerConfiguration()
                .minLevel(dynamicLevelSwitch)
                .writeTo(sink.object)
                .create();

            logger.fatal('A is the first letter');
            logger.verbose('B is the second letter');

            return dynamicLevelSwitch.information()
                .then(() => {
                    logger.verbose('C is the third letter');
                    logger.info('D is the fourth letter');
                })
                .then(() => logger.flush())
                .then(() => {
                    expect(emittedEvents).to.have.length(3);
                    expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'A is the first letter');
                    expect(emittedEvents[1]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
                    expect(emittedEvents[2]).to.have.nested.property('messageTemplate.raw', 'D is the fourth letter');
                });
        });

        it('sets minimum level through the fatal() alias', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel.fatal()
                .writeTo(sink.object)
                .create();

            logger.error('A is the first letter');
            logger.fatal('B is the second letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(1);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });

        it('sets minimum level through the error() alias', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel.error()
                .writeTo(sink.object)
                .create();

            logger.warn('A is the first letter');
            logger.error('B is the second letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(1);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });

        it('sets minimum level through the warning() alias', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel.warning()
                .writeTo(sink.object)
                .create();

            logger.info('A is the first letter');
            logger.warn('B is the second letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(1);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });

        it('sets minimum level through the information() alias', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel.information()
                .writeTo(sink.object)
                .create();

            logger.debug('A is the first letter');
            logger.info('B is the second letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(1);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });

        it('sets minimum level through the debug() alias', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel.debug()
                .writeTo(sink.object)
                .create();

            logger.verbose('A is the first letter');
            logger.debug('B is the second letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(1);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });

        it('sets minimum level through the verbose() alias', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .minLevel.verbose()
                .writeTo(sink.object)
                .create();

            logger.verbose('A is the first letter');
            logger.debug('B is the second letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(2);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'A is the first letter');
                expect(emittedEvents[1]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
            });
        });
    });

    describe('suppressErrors()', () => {
        it('enables suppression when true or undefined', () => {
            const logger1 = new LoggerConfiguration()
                .suppressErrors(true)
                .create();

            const logger2 = new LoggerConfiguration()
                .suppressErrors()
                .create();

            expect(logger1.suppressErrors).to.be.true;
            expect(logger2.suppressErrors).to.be.true;
        });

        it('disables suppression when false', () => {
            const logger = new LoggerConfiguration()
                .suppressErrors(false)
                .create();

            expect(logger.suppressErrors).to.be.false;
        });

        it('uses the value of the last call', () => {
            const logger = new LoggerConfiguration()
                .suppressErrors(false)
                .suppressErrors(true)
                .suppressErrors(false)
                .suppressErrors()
                .suppressErrors(false)
                .create();

            expect(logger.suppressErrors).to.be.false;
        });
    });

    describe('writeTo()', () => {
        it('adds a sink to the pipeline', () => {
            let emittedEvents = [];
            const sink = TypeMoq.Mock.ofType(ConcreteSink);
            sink.setup(m => m.emit(TypeMoq.It.isAny())).callback(events => emittedEvents = emittedEvents.concat(events));

            const logger = new LoggerConfiguration()
                .writeTo(sink.object)
                .create();

            logger.info('A is the first letter');
            logger.info('B is the second letter');
            logger.info('C is the third letter');

            return logger.flush().then(() => {
                expect(emittedEvents).to.have.length(3);
                expect(emittedEvents[0]).to.have.nested.property('messageTemplate.raw', 'A is the first letter');
                expect(emittedEvents[1]).to.have.nested.property('messageTemplate.raw', 'B is the second letter');
                expect(emittedEvents[2]).to.have.nested.property('messageTemplate.raw', 'C is the third letter');
            });
        });
    });
});
