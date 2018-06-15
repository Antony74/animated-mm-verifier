
import {Observable, Subject} from 'rxjs';
import * as superagent from 'superagent';
import * as Pako from 'pako';

enum State {
    ready,
    waiting,
    eof
}

export class MMFile {

    private tokenSubject = new Subject<string>();
    tokenStream: Observable<string> = this.tokenSubject.asObservable();
    private fileIndex = 0;
    private eState = State.ready;
    private inflate = new Pako.Inflate();
    private partialToken = '';
    private data: Uint8Array[] = [];
    private tokenWanted = false;

    constructor(private filename: string) {
        this.inflate.onData = (chunk: Pako.Data) => {
            this.data.push(chunk as Uint8Array);
            if (this.tokenWanted) {
                this.nextToken();
            }
        };

        this.inflate.onEnd = (status: number) => {
            if (status) {
                this.tokenSubject.error(this.inflate);
            }
        };
    }

    nextToken() {
        if (this.data.length) {
            console.log('yay, ready to process some data');
        } else {
            this.tokenWanted = true;
            this.nextDownload();
        }
    }

    private nextDownload() {

        if (this.eState !== State.ready) {
            console.log('nextDownload called when not ready');
        } else {
            ++this.fileIndex;
            let sFileCount: string = this.fileIndex.toString();
            while (sFileCount.length < 3) {
                sFileCount = '0' + sFileCount;
            }

            superagent
                .get(this.filename + '.gz.' + sFileCount)
                .responseType('arraybuffer')
                .then((response: superagent.Response) => {
                    this.inflate.push(response.body, false);
                }).catch((error: superagent.ResponseError) => {
                    if (error.status === 404 && this.fileIndex === 1) {
                        this.eState = State.eof;
                    } else {
                        this.tokenSubject.error(error);
                    }
                })
            ;

        }
    }

}

