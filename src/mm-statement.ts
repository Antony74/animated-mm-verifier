import { IMMLexer } from './mm-lexer-interface';
import { Subject, Observable } from 'rxjs';
import { tap, takeWhile } from 'rxjs/operators';
import { MMScope } from './mm-scope';

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

    getTokens(): ReadonlyArray<string> {
        return this.tokens;
    }

    processProof(scope: MMScope): string {

        if (this.getType() !== '$p') {
            return 'processProof: not a proof';
        }

        const hypotheses: string[] = [];
        const labels: string[] = [];

        let nToken = 2;
        while (nToken < this.tokens.length && this.tokens[nToken] !== '$=') {

            const token = this.tokens[nToken];

            const hyp: MMStatement = scope.getFloatingHypothesis(token, this.index);
            if (hyp) {
                hypotheses.push(hyp.getTokens()[0]);
            }

            ++nToken;
        }

        if (nToken >= this.tokens.length) {
            return 'Unfinished $p statement';
        }

        const nTokenAssignment: number = nToken;

        ++nToken;

        if (this.tokens[nToken] === '(') {
            // Proof is compressed.  Decompress it.

            ++nToken;

            while (nToken < this.tokens.length && this.tokens[nToken] !== ')') {
                const token = this.tokens[nToken];

                labels.push(token);

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
                return proofnumbers;
            }

            this.decompressProof(
                [].concat(
                    hypotheses,
                    scope.getEssentialHypotheses(this.index).map((hyp) => hyp.getTokens()[0])
                ),
                labels,
                proofnumbers as number[]);
        }

        return '';
    }

    // Determine if a token consists solely of upper-case letters or question marks
    private containsonlyupperorq(token: string): boolean {

        for (let n = 0; n < token.length; ++n) {
            if ( (token[n] < 'A' || token[n] > 'Z') && token[n] !== '?') {
                return false;
            }
        }

        return true;
    }

    // Get the raw numbers from compressed proof format.
    // The letter Z is translated as 0.
    private getproofnumbers(proof: string): number[] | string {

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

    private decompressProof(
        hypotheses: string[],
        labels: string[],
        proofnumbers: number[]) {

        console.log('Proof of ' + this.tokens[0]);
        for (let n = 0; n < hypotheses.length; ++n) {
            console.log(['Hypothesis ', n + 1, ', ', hypotheses[n]].join(''));
        }

        for (let n = 0; n < labels.length; ++n) {
            console.log(['Label ', hypotheses.length + n + 1, ', ', labels[n]].join(''));
        }

        for (let n = 0; n < proofnumbers.length; ++n) {
            console.log(['Proof step ', n + 1, ', proof number ', proofnumbers[n]].join(''));
        }

    /*
        const stack: string[] = [];
        const savedSteps: string[] = [];

        for (let n = 0; n < proofnumbers.length; ++n) {

            // Save the last proof step if 0
            if (proofnumbers[n] === 0) {
                savedSteps.push(stack[stack.length - 1]);
                continue;
            }

            // If step is a mandatory hypothesis, just push it onto the stack.
            if (proofnumbers[n] <= floatingHypotheses.length) {
                stack.push(floatingHypotheses[n]);
            } else if (proofnumbers[n] <= floatingHypotheses.length + labels.length) {
                const proofstep: string = labels[n - floatingHypotheses.length - 1];

                // If step is a (non-mandatory) hypothesis,
                // just push it onto the stack.
                std::map<std::string, Hypothesis>::const_iterator hyp
                (hypotheses.find(proofstep));
                if (hyp != hypotheses.end())
                {
                    stack.push_back(hyp->second.first);
                    tree.addLeaf(proofstep, hyp->second.first);
                    continue;
                }

                // It must be an axiom or theorem
                bool const okay(verifyassertionref(label, proofstep, &stack, &tree));
                if (!okay)
                    return false;
            }
            else // Must refer to saved step
            {
                if (*iter > labelt + savedsteps.size())
                {
                    std::cerr << "Number in compressed proof of " << label
                              << " is too high" << std::endl;
                    return false;
                }

                stack.push_back(savedsteps[*iter - labelt - 1]);
                tree.cloneSavedStep(*iter - labelt - 1);
            }
        }

        if (stack.size() != 1)
        {
            std::cerr << "Proof of theorem " << label
                      << " does not end with only one item on the stack"
                      << std::endl;
            return false;
        }

        if (stack[0] != theorem.expression)
        {
            std::cerr << "Proof of theorem " << label << " proves wrong statement"
                      << std::endl;
        }

        std::string dotfilename = label + ".dotfile";

        try
        {
            std::ofstream dotfile(dotfilename);
            dotfile << tree.asString().c_str();
        }
        catch (std::exception e)
        {
            printf("Problem writing %s: %s\n", dotfilename.c_str(), e.what());
        }

        return true;
*/
    }
}

