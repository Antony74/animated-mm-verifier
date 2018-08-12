import { MMCommentStripper } from './mm-comment-stripper';
import { MMStatement } from './mm-statement';
import { MMScope } from './mm-scope';
import { take } from 'rxjs/operators';
import { IMMLexer } from './mm-lexer-interface';
import { Stream, Observer } from './stream';
import { StateCheckedStream } from './state-checked-stream';

class MMParser implements Stream<MMStatement> {

    private mmLexer: IMMLexer;

    // Library
    private statements: MMStatement[] = [];
    private rootScope: MMScope = new MMScope(null);
    // End of library

    private currentScope: MMScope = this.rootScope;

    constructor(filename: string) {
        this.mmLexer = new MMCommentStripper(filename);
    }

    read(observer: Observer<MMStatement>) {

        this.mmLexer.tokenStream.pipe(take(1)).subscribe({
            next: (token: string): boolean => {

                switch (token) {
                case '${':
                    this.currentScope = new MMScope(this.currentScope);
                    return true;

                case '$}':
                    if (this.currentScope.parent === null) {
                        observer.error('$} without corresponding ${');
                        return false;
                    } else {
                        this.currentScope = this.currentScope.parent;
                        return true;
                    }
                    break;

                case '$c':
                case '$v':
                case '$d':
                    this.parseStatement(token, observer);
                    return false;

                default:
                    if (token.length && token[0] === '$') {
                        observer.error('token ' + token + ' not supported (yet)');
                        return false;
                    } else if (this.currentScope.get(token, this.statements.length)) {
                        observer.error('statement ' + token + ' already exists');
                        return false;
                    } else {
                        this.parseStatement(token, observer);
                        return false;
                    }
                }
            },
            error: (error: any) => {
                observer.error(error);
            },
            complete: () => {
                if (this.mmLexer.isComplete()) {
                    observer.complete();
                }
            }
        });

        this.mmLexer.nextToken();
    }

    private parseStatement(token: string, observer: Observer<MMStatement>) {
        const statement: MMStatement = new MMStatement(this.mmLexer, token, this.statements.length);
        statement.read({
            next: (): boolean => {
                return true;
            },
            error: (error) => {
                observer.error(error);
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

                    if (statement.getType() === '$p') {
                        const error: string = statement.processProof(this.currentScope);

                        if (error.length) {
                            brc = false;
                            observer.error(error);
                        }
                    }

                    if (brc) {
                        brc = this.currentScope.add(statement.getTokens()[0], statement);
                    }

                    break;
                case '$d':
                    this.currentScope.addDistinctiveness(statement);
                    break;
                default:
                    observer.error('statement type ' + statement.getType() + ' not supported (yet)');
                }

                if (brc) {
                    this.statements.push(statement);
                    observer.next(statement);
                }
            }
        });
    }

    private completeCV(statement: MMStatement): boolean {
        const tokens: ReadonlyArray<string> = statement.getTokens();
        for (let n = 1; n < tokens.length; ++n) {
            this.currentScope.add(tokens[n], statement);
        }

        return true;
    }
}

export function createParser(filename: string): Stream<MMStatement> {
    return new StateCheckedStream<MMStatement>(new MMParser(filename));
}

