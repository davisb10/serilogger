import {Sink} from '../src/sink';
import {PipelineStage} from '../src/pipeline';
import {ConsoleProxy} from '../src/consoleSink';
import {LogEvent} from "../src/logEvent";

export class ConcreteSink implements Sink {
    emit(events: LogEvent[]) {
    }

    flush(): Promise<any> {
        return Promise.resolve();
    }
}

export class ConcretePipelineStage implements PipelineStage {
    emit(events: LogEvent[]) {
        return events;
    }

    flush(): Promise<any> {
        return Promise.resolve();
    }
}

export class ConcreteConsoleProxy implements ConsoleProxy {
    error(message?: any, ...properties: any[]) {
    }

    warn(message?: any, ...properties: any[]) {
    }

    info(message?: any, ...properties: any[]) {
    }

    debug(message?: any, ...properties: any[]) {
    }

    log(message?: any, ...properties: any[]) {
    }
}

export class ConcreteStorage {
    length: number = 0;

    getItem(key: string): string {
        return this[key] || null;
    }

    setItem(key: string, data: string) {
        if (!this.getItem(key)) {
            ++this.length;
        }
        this[key] = data;
    }

    removeItem(key: string) {
        this[key] = null;
        delete this[key];
        --this.length;
    }
}
