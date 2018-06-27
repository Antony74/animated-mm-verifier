import { IMMLexer } from './mm.lexer.interface';
import { Subject, Observable } from 'rxjs';
import { tap, takeWhile } from 'rxjs/operators';

export class MMStatement {

    private tokens: string[] = [];
    private subject: Subject<void> = new Subject<void>();
    stream: Observable<void> = this.subject.asObservable();

    constructor(mmLexer: IMMLexer, firstToken: string, readonly index: number) {
        this.tokens.push(firstToken);

        let currentToken = '';

        mmLexer.tokenStream.pipe(
            tap( (token: string) => currentToken = token ),
            takeWhile((token: string) => token !== '$.')).subscribe({
            next: (token: string) => {
                this.tokens.push(token);
                mmLexer.nextToken();
            },
            error: (error) => {
                this.subject.error(error);
            },
            complete: () => {
                if (currentToken === '$.') {
                    this.subject.complete();
                } else {
                    this.subject.error('unterminated statement');
                }
            }
        });

        mmLexer.nextToken();
    }

    toString(): string {
        return this.tokens.join(' ') + ' $.';
    }

    getType(): string {

        let type: string = this.tokens.length ? this.tokens[0] : '';

        if (type === '$c' || type === '$v') {
            return type;
        }

        type = (this.tokens.length >= 2) ? this.tokens[1] : '';

        if (type === '$a' || type === '$f' || type === '$p' || type === '$e') {
            return type;
        }

        console.error('Failed to identify statement type.  This statement should never have made it into the library');
        return '';
    }

    getTokens(): string[] {
        return this.tokens;
    }

}

