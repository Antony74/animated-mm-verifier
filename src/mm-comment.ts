import { Stream, Observer } from './stream';
import { takeWhile, tap } from 'rxjs/operators';
import { IMMLexer } from './mm-lexer-interface';

export class MMComment implements Stream<void> {

    mmLexer: IMMLexer;

    constructor(mmLexer: IMMLexer) {
        this.mmLexer = mmLexer;
    }

    read(observer: Observer<void>) {
        let currentToken = '';

        this.mmLexer.tokenStream.pipe(
            tap( (token: string) => currentToken = token ),
            takeWhile((token: string) => token !== '$)')).subscribe({
            next: (token: string) => {

                if (token.includes('$(')) {
                    observer.error('Characters $( found in a comment');
                    return;
                }

                if (token.includes('$)')) {
                    observer.error('Characters $) found in a comment');
                    return;
                }

                this.mmLexer.nextToken();
            },
            error: (error) => {
                observer.error(error);
            },
            complete: () => {
                if (currentToken === '$)') {
                    observer.complete();
                } else {
                    observer.error('unclosed comment');
                }
            }
        });

        this.mmLexer.nextToken();
    }
}

