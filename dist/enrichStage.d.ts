import { PipelineStage } from './pipeline';
import { LogEvent } from './logEvent';
export declare type ObjectFactory = (properties?: Object) => Object;
export declare class EnrichStage implements PipelineStage {
    private readonly enricher;
    constructor(enricher: Object | ObjectFactory);
    emit(events: LogEvent[]): LogEvent[];
    flush(): Promise<any>;
}
