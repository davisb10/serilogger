import { PipelineStage } from './pipeline';
import { LogEvent } from './logEvent';
export declare class FilterStage implements PipelineStage {
    private readonly predicate;
    constructor(predicate: (e: LogEvent) => boolean);
    emit(events: LogEvent[]): LogEvent[];
    flush(): Promise<any>;
}
