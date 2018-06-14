
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
    tokenStream: Observable<string> = this.tokenSubject;
    private nextFileIndex = 1;
    private eState = State.ready;
    private inflate = new Pako.Inflate();

    constructor(private filename: string) {
    }

    nextToken() {
        this.nextDownload();
    }

    private nextDownload() {

        if (this.eState !== State.ready) {
            console.log('nextDownload called when not ready');
        } else {
            let sFileCount: string = this.nextFileIndex.toString();
            while (sFileCount.length < 3) {
                sFileCount = '0' + sFileCount;
            }

            superagent.get(this.filename + '.gz.' + sFileCount).then((response) => {
                this.inflate.push(response.text, false);
            }).catch((error) => {
                this.tokenSubject.error(error);
            });

            ++this.nextFileIndex;
        }
    }

}

