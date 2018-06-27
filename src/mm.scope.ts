import { MMStatement } from './mm.statement';

export class MMScope {
    private children: MMScope[] = [];
    private statements: Map<string, MMStatement> = new Map<string, MMStatement>();
    private distinctivnesses: MMStatement[] = []; // Put $d statements here for now.  I may have to index them though.

    constructor(readonly parent: MMScope) {
        if (this.parent) {
            this.parent.children.push(this);
        }
    }

    add(label: string, statement: MMStatement): boolean {
        const type: string = statement.getType();

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

    get(label: string, index: number) {
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

    addDistinctiveness(statement: MMStatement) {
        this.distinctivnesses.push(statement);
    }
}

