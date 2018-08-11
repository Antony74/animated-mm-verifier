import { MMStatement } from './mm-statement';

export class MMScope {
    private children: MMScope[] = [];
    private statements: Map<string, MMStatement> = new Map<string, MMStatement>();
    private distinctivnesses: MMStatement[] = []; // Put $d statements here for now.  I may have to index them though.
    private floatingHypotheses: Map<string, MMStatement> = new Map<string, MMStatement>();
    private essentialHypotheses: MMStatement[] = [];

    constructor(readonly parent: MMScope) {
        if (this.parent) {
            this.parent.children.push(this);
        }
    }

    add(label: string, statement: MMStatement): boolean {
        const type: string = statement.getType();

        if (type === '$f') {
            const lastToken: string = statement.getTokens()[statement.getTokens().length - 1];
            this.floatingHypotheses.set(lastToken, statement);
        } else if (type === '$e') {
            this.essentialHypotheses.push(statement);
        }

        if ( this.parent !== null && (type === '$a' || type === '$p') ) {
            return this.parent.add(label, statement);
        }

        const existingStatement: MMStatement = this.get(label, statement.index);

        if (existingStatement) {
            return false;
        } else {
            this.statements.set(label, statement);
            return true;
        }
    }

    get(label: string, index: number): MMStatement {
        const statement = this.statements.get(label);
        if (statement) {
            if (statement.index < index) {
                return statement;
            } else {
                return null;
            }
        } else if (this.parent) {
            return this.parent.get(label, index);
        } else {
            return null;
        }
    }

    getFloatingHypothesis(symbol: string, index: number): MMStatement {
        const statement = this.floatingHypotheses.get(symbol);
        if (statement && statement.getType() === '$f') {
            if (statement.index < index) {
                return statement;
            } else {
                return null;
            }
        } else if (this.parent) {
            return this.parent.getFloatingHypothesis(symbol, index);
        } else {
            return null;
        }
    }

    getEssentialHypotheses(index: number): MMStatement[] {
        const fromParent: MMStatement[] = this.parent ? this.parent.getEssentialHypotheses(index) : [];
        const retval = [].concat(fromParent, this.essentialHypotheses).filter((statement: MMStatement) => statement.index < index);
        return retval;
    }

    addDistinctiveness(statement: MMStatement) {
        this.distinctivnesses.push(statement);
    }

}

