
import {Observable, Subject} from 'rxjs';
import * as superagent from 'superagent';
import * as Pako from 'pako';
import { IMMLexer } from './mm.lexer.interface';

class Data {
    private data: Uint8Array[] = [];
    private dataIndex = 0;
    private length = 0;

    getLength(): number {
        return this.length;
    }

    push(chunk: Uint8Array) {
        this.length += chunk.length;
        this.data.push(chunk);
    }

    getNextCharCode(): number | false {

        while (this.data.length && this.dataIndex >= this.data[0].length ) {
            this.data.shift();
            this.dataIndex = 0;
        }

        if (this.data.length) {
            const charCode = this.data[0][this.dataIndex];
            ++this.dataIndex;
            --this.length;
            return charCode;
        }

        return false;
    }
}

enum State {
    ready,
    waiting,
    eof
}

export class MMLexer implements IMMLexer {

    private tokenSubject = new Subject<string>();
    tokenStream: Observable<string> = this.tokenSubject.asObservable();
    private fileIndex = 0;
    private eState = State.ready;
    private inflate = new Pako.Inflate();
    private partialToken = '';
    private tokenWanted = false;
    private data: Data = new Data();
    private complete = false;

    constructor(private filename: string) {
        this.inflate.onData = (chunk: Pako.Data) => {
            this.data.push(chunk as Uint8Array);
            if (this.tokenWanted) {
                this.tokenWanted = false;
                this.nextToken();
            }
        };

        this.inflate.onEnd = (status: number) => {
            if (status) {
                const msg: string = ['Failed to unzip "', this.filename, '", error ', status].join('');
                this.tokenSubject.error(msg);
            } else {
                console.log('Inflate complete');
            }
        };
    }

    // Determine if a character is white space in Metamath.
    ismmws(cc: number): boolean {
        // This doesn't include \v ("vertical tab"), as the spec omits it.
        switch (cc) {
        case 0x20: // ' '
        case 0x0A: // '\n'
        case 0x09: // '\t'
        case 0x0C: // '\f'
        case 0x0D: // '\r'
            return true;
        default:
            return false;
        }
    }

    nextToken() {

        setImmediate(() => {

            if (this.tokenWanted) {
                this.tokenSubject.error('MMLexer nextToken() called while still waiting on previous token');
                return;
            }

            for (;;) {
                const charCode = this.data.getNextCharCode();

                if (charCode === false) {

                    switch (this.eState) {
                    case State.eof:
                        this.complete = true;
                        this.tokenSubject.complete();
                        break;
                    case State.ready:
                        this.tokenWanted = true;
                        this.nextDownload();
                        break;
                    }

                    return;

                } else if (this.ismmws(charCode)) {
                    if (this.partialToken.length) {
                        const token: string = this.partialToken;
                        this.partialToken = '';
                        this.tokenWanted = false;

                        if (this.eState === State.ready && this.data.getLength() < 256 * 1024) {
                            this.nextDownload();
                        }

                        this.tokenSubject.next(token);
                        return;
                    }
                } else {
                    this.partialToken += String.fromCharCode(charCode);
                }
            }
        });
    }

    private nextDownload() {

        if (this.eState !== State.ready) {
            console.log('MMLexer nextDownload called when not ready');
        } else {
            ++this.fileIndex;
            let sFileCount: string = this.fileIndex.toString();
            while (sFileCount.length < 3) {
                sFileCount = '0' + sFileCount;
            }

            this.eState = State.waiting;

            superagent
                .get(this.filename + '.gz.' + sFileCount)
                .responseType('arraybuffer')
                .then((response: superagent.Response) => {
                    this.eState = State.ready;
                    this.inflate.push(response.body, false);
                }).catch((error: superagent.ResponseError) => {
                    if (error.status === 404 && this.fileIndex !== 1) {
                        this.eState = State.eof;
                        this.inflate.push(new ArrayBuffer(0), true);

                        if (this.data.getLength() === 0) {
                            this.complete = true;
                            this.tokenSubject.complete();
                        }

                    } else {
                        this.tokenSubject.error(error);
                    }
                })
            ;

        }
    }

    isComplete(): boolean {
        return this.complete;
    }
}

