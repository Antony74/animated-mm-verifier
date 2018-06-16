
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
    private dataIndex = 0;
    private tokenWanted = false;

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
                this.tokenSubject.error(this.inflate);
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

    private getNextCharCode(): number | false {
        while (this.data.length && this.dataIndex >= this.data[0].length ) {
            this.data.shift();
            this.dataIndex = 0;
        }

        if (this.data.length) {
            const charCode = this.data[0][this.dataIndex];
            ++this.dataIndex;
            return charCode;
        }

        return false;
    }

    nextToken() {

        if (this.tokenWanted) {
            this.tokenSubject.error('nextToken() called while still waiting on previous token');
            return;
        }

        for (;;) {
            const charCode = this.getNextCharCode();

            if (charCode === false) {
                this.tokenWanted = true;
                this.nextDownload();
                return;
            } else if (this.ismmws(charCode)) {
                if (this.partialToken.length) {
                    const token: string = this.partialToken;
                    this.partialToken = '';
                    this.tokenWanted = false;
                    this.tokenSubject.next(token);
                    return;
                }
            } else {
                this.partialToken += String.fromCharCode(charCode);
            }
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
                    if (error.status === 404 && this.fileIndex !== 1) {
                        this.eState = State.eof;

                        if (this.data.length === 0) {
                            this.tokenSubject.complete();
                        }

                    } else {
                        this.tokenSubject.error(error);
                    }
                })
            ;

        }
    }

}

