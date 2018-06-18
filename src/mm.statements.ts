import { MMFile } from './mm.file';
import { MMComment } from './mm.comment';
import { MMStatement } from './mm.statement';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

enum State {
    ready,
    waiting,
    eof
}

export class MMStatements {

    private mmFile: MMFile;
    private eState: State = State.ready;
    private statementSubject: Subject<MMStatement> = new Subject<MMStatement>();
    statementStream: Observable<MMStatement> = this.statementSubject.asObservable();

    constructor(filename: string) {
        this.mmFile = new MMFile(filename);
    }

    nextStatement() {
        if (this.eState !== State.ready) {
            this.statementSubject.error('nextStatement() called when not ready');
            return;
        }

        this.eState = State.waiting;

        this.mmFile.tokenStream.pipe(take(1)).subscribe({
            next: (token: string) => {

                switch (token) {
                case '$(':
                    const comment: MMComment = new MMComment(this.mmFile);
                    comment.commentStream.subscribe({
                        error: (error) => {
                            this.statementSubject.error(error);
                        },
                        complete: () => {
                            this.eState = State.ready;
                            this.nextStatement();
                        }
                    });
                    break;

                default:
                    this.statementSubject.error('token ' + token + ' not supported (yet)');
                }
            },
            error: (error: any) => {
                this.statementSubject.error(error);
            },
            complete: () => {
                this.statementSubject.complete();
            }
        });

        this.mmFile.nextToken();
    }
}

