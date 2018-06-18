import { MMLexer } from './mm.lexer';
import { Observable, Subject } from 'rxjs';
import { takeWhile, tap } from 'rxjs/operators';

export class MMComment {

    private commentSubject: Subject<void> = new Subject<void>();
    commentStream: Observable<void> = this.commentSubject.asObservable();

    constructor(file: MMLexer) {

        let currentToken = '';

        file.tokenStream.pipe(
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

                file.nextToken();
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

        file.nextToken();
    }
}

