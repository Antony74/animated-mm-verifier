import { Observable } from 'rxjs';

export interface IMMLexer {
    tokenStream: Observable<string>;

    nextToken();
    isComplete(): boolean;
}

