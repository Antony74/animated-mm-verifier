import { MachineConfig } from 'xstate/lib/types';

export interface MachineModule {
    machineConfig: MachineConfig;
    effects: {[key: string]: (dispatch, state) => void };
    reducers: (state, action) => any;
}

