import { Observable, Subject } from 'rxjs';
import { takeWhile, tap } from 'rxjs/operators';
import { IMMLexer } from './mm-lexer-interface';

export class MMComment {

    private commentSubject: Subject<void> = new Subject<void>();
    commentStream: Observable<void> = this.commentSubject.asObservable();

    constructor(mmLexer: IMMLexer) {

        let currentToken = '';

        mmLexer.tokenStream.pipe(
            tap( (token: string) => currentToken = token ),
            takeWhile((token: string) => token !== '$)')).subscribe({
            next: (token: string) => {

                if (token.includes('$(')) {
                    this.commentSubject.error('Characters $( found in a comment');
                    return;
                }

                if (token.includes('$)')) {
                    this.commentSubject.error('Characters $) found in a comment');
                    return;
                }

                mmLexer.nextToken();
            },
            error: (error) => {
                this.commentSubject.error(error);
            },
            complete: () => {
                if (currentToken === '$)') {
                    this.commentSubject.complete();
                } else {
                    this.commentSubject.error('unclosed comment');
                }
            }
        });

        mmLexer.nextToken();
    }
}

