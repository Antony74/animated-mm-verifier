
import { Stream, Observer } from './stream';

enum StreamState {
    ready,
    waiting,
    complete
}

export class StateCheckedStream<DATA> implements Stream<DATA> {

    private stream: Stream<DATA>;
    private state: StreamState = StreamState.ready;

    constructor(stream: Stream<DATA>) {
        this.stream = stream;
    }

    read(observer: Observer<DATA>): void {

        if (this.state !== StreamState.ready) {
            observer.error('read() called when not ready');
        } else {
            this.state = StreamState.waiting;

            this.stream.read({
                next: (data: DATA): boolean => {

                    if (this.state !== StreamState.waiting) {
                        observer.error('next() called when not waiting');
                    }

                    const brc: boolean = observer.next(data);

                    if (brc === false && this.state === StreamState.waiting) {
                        this.state = StreamState.ready;
                    }

                    return brc;
                },
                error: (s: string) => {
                    this.state = StreamState.complete;
                    observer.error(s);
                },
                complete: () => {
                    this.state = StreamState.complete;
                    observer.complete();
                }
            });
        }

    }

}

