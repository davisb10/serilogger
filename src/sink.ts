import {LogEvent} from './logEvent';
import {PipelineStage} from './pipeline';

export interface Sink {
    emit(events: LogEvent[]): any;

    flush(): Promise<any>;
}

export class SinkStage implements PipelineStage {
    private readonly sink: Sink;

    constructor(sink: Sink) {
        this.sink = sink;
    }

    emit(events: LogEvent[]): LogEvent[] {
        this.sink.emit(events);
        return events;
    }

    flush(): Promise<any> {
        return this.sink.flush();
    }
}
