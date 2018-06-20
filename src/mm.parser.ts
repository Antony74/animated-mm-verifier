import { MMLexer } from './mm.lexer';
import { MMComment } from './mm.comment';
import { MMStatement } from './mm.statement';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

enum State {
    ready,
    waiting,
    eof
}

export class MMParser {

    private mmLexer: MMLexer;
    private eState: State = State.ready;
    private statementSubject: Subject<MMStatement> = new Subject<MMStatement>();
    statementStream: Observable<MMStatement> = this.statementSubject.asObservable();

    constructor(filename: string) {
        this.mmLexer = new MMLexer(filename);
    }

    nextStatement() {
        if (this.eState !== State.ready) {
            this.statementSubject.error('nextStatement() called when not ready');
            return;
        }

        this.eState = State.waiting;

        this.mmLexer.tokenStream.pipe(take(1)).subscribe({
            next: (token: string) => {

                switch (token) {
                case '$(':

                    this.parseComment();
                    break;

                case '$c':
                case '$v':
                    this.parseStatement(token);
                    break;

                default:
                    this.statementSubject.error('token ' + token + ' not supported (yet)');
                }
            },
            error: (error: any) => {
                this.statementSubject.error(error);
            },
            complete: () => {
                if (this.mmLexer.isComplete()) {
                    this.statementSubject.complete();
                }
            }
        });

        this.mmLexer.nextToken();
    }

    parseComment() {
        const comment: MMComment = new MMComment(this.mmLexer);
        comment.commentStream.subscribe({
            error: (error) => {
                this.statementSubject.error(error);
            },
            complete: () => {
                this.eState = State.ready;
                this.nextStatement();
            }
        });
    }

    parseStatement(token: string) {
        const statement: MMStatement = new MMStatement(this.mmLexer, token);
        statement.stream.subscribe({
            error: (error) => {
                this.statementSubject.error(error);
            },
            complete: () => {
                this.eState = State.ready;
                this.statementSubject.next(statement);
            }
        });
    }
}

