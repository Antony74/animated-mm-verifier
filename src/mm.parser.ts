import { MMCommentStripper } from './mm.comment.stripper';
import { MMStatement } from './mm.statement';
import { MMScope } from './mm.scope';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { IMMLexer } from './mm.lexer.interface';

enum State {
    ready,
    waiting,
    eof
}

export class MMParser {

    private mmLexer: IMMLexer;
    private eState: State = State.ready;
    private statementSubject: Subject<MMStatement> = new Subject<MMStatement>();
    statementStream: Observable<MMStatement> = this.statementSubject.asObservable();

    // Library
    private statements: MMStatement[] = [];
    private rootScope: MMScope = new MMScope(null);
    // End of library

    private currentScope: MMScope = this.rootScope;

    constructor(filename: string) {
        this.mmLexer = new MMCommentStripper(filename);
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
                case '${':
                    this.currentScope = new MMScope(this.currentScope);
                    this.eState = State.ready;
                    this.nextStatement();
                    break;

                case '$}':
                    if (this.currentScope.parent === null) {
                        this.statementSubject.error('$} without corresponding ${');
                    } else {
                        this.currentScope = this.currentScope.parent;
                        this.eState = State.ready;
                        this.nextStatement();
                    }
                    break;

                case '$c':
                case '$v':
                    this.parseStatement(token);
                    break;

                default:
                    if (token.length && token[0] === '$') {
                        this.statementSubject.error('token ' + token + ' not supported (yet)');
                    } else if (this.currentScope.get(token, this.statements.length)) {
                        this.statementSubject.error('statement ' + token + ' already exists');
                    } else {
                        this.parseStatement(token);
                    }
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

    parseStatement(token: string) {
        const statement: MMStatement = new MMStatement(this.mmLexer, token, this.statements.length);
        statement.stream.subscribe({
            error: (error) => {
                this.statementSubject.error(error);
            },
            complete: () => {

                let brc = true;

                switch (statement.getType()) {
                case '$c':
                case '$v':
                    brc = this.completeCV(statement);
                    break;
                case '$f':
                case '$a':
                case '$e':
                case '$p':
                    brc = this.currentScope.add(statement.getTokens()[0], statement);
                    break;
                default:
                    this.statementSubject.error('statement type ' + statement.getType() + ' not supported (yet)');
                }

                if (brc) {
                    this.statements.push(statement);
                    this.eState = State.ready;
                    this.statementSubject.next(statement);
                }
            }
        });
    }

    completeCV(statement: MMStatement): boolean {
        const tokens: string[] = statement.getTokens();
        for (let n = 1; n < tokens.length; ++n) {
            this.currentScope.add(tokens[n], statement);
        }

        return true;
    }
}

