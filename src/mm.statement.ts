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

        if (type === '$c' || type === '$v' || type === '$d') {
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

    decompressProof(): string {
        let nToken = 0;
        while (nToken < this.tokens.length && this.tokens[nToken] !== '$=') {
            ++nToken;
        }

        if (nToken >= this.tokens.length) {
            return 'Unfinished $p statement';
        }

        const nTokenAssignment: number = nToken;

        ++nToken;

        if (this.tokens[nToken] !== '(') {
            return ''; // Proof is not compressed.  No action needed.
        }

        while (nToken < this.tokens.length && this.tokens[nToken] !== ')') {
            ++nToken;
        }

        if (nToken >= this.tokens.length) {
            return 'Unfinished $p statement';
        }

        ++nToken;

        // Get proof steps

        let proof = '';
        while (nToken < this.tokens.length) {

            const token: string = this.tokens[nToken];
            proof += token;
            if (!this.containsonlyupperorq(token)) {
                return 'Bogus character found in compressed proof of ' + this.tokens[0];
            }

            ++nToken;
        }

        if (!proof.length) {
            return 'Theorem ' + this.tokens[0] + ' has no proof';
        }

        const proofnumbers: number[] | string = this.getproofnumbers(proof);

        if (typeof(proofnumbers) === 'string') {
            this.subject.error(proofnumbers);
        } else {
            console.log(proofnumbers);
        }

        return '';
    }

    // Determine if a token consists solely of upper-case letters or question marks
    containsonlyupperorq(token: string): boolean {

        for (let n = 0; n < token.length; ++n) {
            if ( (token[n] < 'A' || token[n] > 'Z') && token[n] !== '?') {
                return false;
            }
        }

        return true;
    }

    // Get the raw numbers from compressed proof format.
    // The letter Z is translated as 0.
    getproofnumbers(proof: string): number[] | string {

        const proofnumbers: number[] = [];
        let num = 0;
        let justgotnum = false;

        for (let n = 0; n < proof.length; ++n) {
            if (proof[n] <= 'T') {
                const addval = proof.charCodeAt(n) - ('A'.charCodeAt(0) - 1);

                if (num > Number.MAX_SAFE_INTEGER / 20 || 20 * num > Number.MAX_SAFE_INTEGER - addval) {
                    return 'Overflow computing numbers in compressed proof of ' + this.tokens[0];
                }

                proofnumbers.push(20 * num + addval);
                num = 0;
                justgotnum = true;

            } else if (proof[n] <= 'Y') {

                const addval = proof.charCodeAt(n) - 'T'.charCodeAt(0);

                if (num > Number.MAX_SAFE_INTEGER / 5 || 5 * num > Number.MAX_SAFE_INTEGER - addval) {
                    return 'Overflow computing numbers in compressed proof of ' + this.tokens[0];
                }

                num = 5 * num + addval;
                justgotnum = false;

            } else { // It must be Z

                if (!justgotnum) {
                    return 'Stray Z found in compressed proof of ' + this.tokens[0];
                }

                proofnumbers.push(0);
                justgotnum = false;
            }
        }

        if (num !== 0) {
            return 'Compressed proof of theorem ' + this.tokens[0] + ' ends in unfinished number';
        }

        return proofnumbers;
    }

}

