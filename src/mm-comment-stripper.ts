
import { MMLexer } from './mm-lexer';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { IMMLexer } from './mm-lexer-interface';
import { MMComment } from './mm-comment';

enum State {
    ready,
    waiting,
    eof
}

export class MMCommentStripper implements IMMLexer {

    private mmLexer: MMLexer;
    private eState: State = State.ready;
    private tokenSubject: Subject<string> = new Subject<string>();
    tokenStream: Observable<string> = this.tokenSubject.asObservable();

    constructor(filename: string) {
        this.mmLexer = new MMLexer(filename);
    }

    nextToken() {
        if (this.eState !== State.ready) {
            this.tokenSubject.error('MMCommentStripper nextToken() called when not ready');
            return;
        }

        this.eState = State.waiting;

        this.mmLexer.tokenStream.pipe(take(1)).subscribe({
            next: (token: string) => {

                switch (token) {
                case '$(':
                    this.parseComment();
                    break;
                default:
                    this.eState = State.ready;
                    this.tokenSubject.next(token);
                }
            },
            error: (error) => {
                this.tokenSubject.error(error);
            },
            complete: () => {

                if (this.mmLexer.isComplete()) {
                    this.eState = State.eof;
                    this.tokenSubject.complete();
                }
            }
        });

        this.mmLexer.nextToken();
    }

    parseComment() {
        const comment: MMComment = new MMComment(this.mmLexer);
        comment.commentStream.subscribe({
            error: (error) => {
                this.tokenSubject.error(error);
            },
            complete: () => {
                this.eState = State.ready;
                this.nextToken();
            }
        });
    }

    isComplete(): boolean {
        return this.mmLexer.isComplete();
    }
}

