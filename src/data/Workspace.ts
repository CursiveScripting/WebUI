import { Dictionary } from './Dictionary';
import { SystemProcess } from './SystemProcess';
import { Type } from './Type';
import { UserProcess } from './UserProcess';
// import { WorkspaceLoading } from '../io/WorkspaceLoading';

export class Workspace {
    systemProcesses: Dictionary<SystemProcess>;
    userProcesses: Dictionary<UserProcess>;
    types: Dictionary<Type>;

    constructor() {
        this.systemProcesses = new Dictionary<SystemProcess>();
        this.userProcesses = new Dictionary<UserProcess>();
        this.types = new Dictionary<Type>();
    }

    validate() {
        let valid = true;

        for (let i = 0; i < this.userProcesses.count; i++) {
            let process = this.userProcesses.values[i];
            if (!process.validate()) {
                valid = false;
            }
        }

        return valid;
    }
    
    showError(message: string) {
        // console.error(message);
    }
}