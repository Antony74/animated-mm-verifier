import { MMLexer } from './mm.lexer';
import { Subject, Observable } from 'rxjs';
import { tap, takeWhile } from 'rxjs/operators';

export class MMStatement {

    private tokens: string[] = [];
    private subject: Subject<void> = new Subject<void>();
    stream: Observable<void> = this.subject.asObservable();

    constructor(mmLexer: MMLexer, firstToken: string) {
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

}

