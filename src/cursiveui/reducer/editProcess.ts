import { IParameter } from '../state/IParameter';
import { IUserProcess } from '../state/IUserProcess';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { hasEditableSignature, isUserProcess } from '../services/ProcessFunctions';
import { isProcessStep, isStartStep, isStopStep, usesOutputs } from '../services/StepFunctions';
import { validateNamedProcesses, withValidationDisabled } from './validate';
import { removeStep } from './removeStep';
import { addStep } from './addStep';
import { setReturnPath } from './setReturnPath';
import { IProcessStep } from '../state/IProcessStep';
import { linkVariable } from './linkVariable';
import { IStepParameter } from '../state/IStepParameter';

export type EditProcessAction = {
    type: 'edit process';
    oldName: string;
    newName: string;
    description: string;
    folder: string | null;
    returnPaths: string[];
    inputs: IParameter[];
    outputs: IParameter[];
    inputOrderMap: Array<number | undefined>; // Used for mapping variable connections. Array index is for the new parameter,
    outputOrderMap: Array<number | undefined>; // value is index of the old parameter it corresponds to.
}

export function editProcess(state: IWorkspaceState, action: EditProcessAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.oldName);

    if (processIndex === -1) {
        return state;
    }

    const oldProcess = state.processes[processIndex];

    if (!hasEditableSignature(oldProcess)) {
        return state;
    }

    const modifiedProcessNames = [ action.newName ];

    let startStopUnlinkActions: ((s: IWorkspaceState) => IWorkspaceState)[] = [];
    let startStopRelinkActions: ((s: IWorkspaceState) => IWorkspaceState)[] = [];

    // update the i/o of process's own start and stop steps
    for (const step of oldProcess.steps) {
        if (isStartStep(step)) {
            relinkStartStopParameters(
                startStopUnlinkActions,
                startStopRelinkActions,
                step.outputs,
                action.inputs,
                step.uniqueId,
                action.oldName,
                action.newName,
                true,
                action.inputOrderMap
            );
        }

        if (isStopStep(step)) {
            relinkStartStopParameters(
                startStopUnlinkActions,
                startStopRelinkActions,
                step.inputs,
                action.outputs,
                step.uniqueId,
                action.oldName,
                action.newName,
                false,
                action.outputOrderMap
            );
        }
    }

    withValidationDisabled(() => {
        for (const action of startStopUnlinkActions) {
            state = action(state);
        }
    });

    const newProcess: IUserProcess = {
        ...oldProcess,
        name: action.newName,
        description: action.description,
        folder: action.folder,
        inputs: action.inputs,
        outputs: action.outputs,
        returnPaths: action.returnPaths,
        steps: oldProcess.steps.slice(),
    };

    const processes = state.processes.slice();
    processes[processIndex] = newProcess;

    state = {
        ...state,
        processes,
    };

    withValidationDisabled(() => {
        for (const action of startStopRelinkActions) {
            state = action(state);
        }
    });

    const followupActions: ((s: IWorkspaceState) => IWorkspaceState)[] = [];

    // Find all steps that used this process. Queue up their deletion, recreation, and re-connection.
    for (const process of state.processes) {
        if (process === newProcess || !isUserProcess(process)) {
            continue;
        }

        let anyStepMatched = false;

        for (const step of process.steps) {
            if (!isProcessStep(step) || step.process !== oldProcess) {
                continue;
            }

            anyStepMatched = true;

            deleteAndRecreateStep(process, step, newProcess, oldProcess, followupActions, action.inputOrderMap, action.outputOrderMap);
        }

        if (anyStepMatched) {
            modifiedProcessNames.push(process.name);
        }
    }

    withValidationDisabled(() => {
        for (const action of followupActions) {
            state = action(state);
        }
    });

    validateNamedProcesses(modifiedProcessNames, state.processes);

    return state;
}

function relinkStartStopParameters(
    unlinkActions: ((s: IWorkspaceState) => IWorkspaceState)[],
    relinkActions: ((s: IWorkspaceState) => IWorkspaceState)[],
    oldParameters: IStepParameter[],
    newParameters: IParameter[],
    stepId: string,
    oldName: string,
    newName: string,
    isProcessInput: boolean,
    orderMap: Array<number | undefined>
) {
    for (let oldIndex = 0; oldIndex < oldParameters.length; oldIndex++) {
        const param = oldParameters[oldIndex];

        if (param.connection === undefined) {
            continue;
        }

        unlinkActions.push(state => linkVariable(state, {
            inProcessName: oldName,
            stepId,
            stepParamName: param.name,
            stepInputParam: !isProcessInput,
            varName: undefined,
        }));

        const newIndex = orderMap.indexOf(oldIndex);

        if (newIndex !== -1) {
            const newParamName = newParameters[newIndex].name;
            const varName = param.connection.name;

            relinkActions.push(state => linkVariable(state, {
                inProcessName: newName,
                stepId,
                stepParamName: newParamName,
                stepInputParam: !isProcessInput,
                varName,
            }));
        }
    }
}

function deleteAndRecreateStep(
    inProcess: IUserProcess,
    step: IProcessStep,
    newProcess: IUserProcess,
    oldProcess: IUserProcess,
    actions: ((s: IWorkspaceState) => IWorkspaceState)[],
    inputOrderMap: Array<number | undefined>,
    outputOrderMap: Array<number | undefined>
) {
    actions.push(state => removeStep(state, {
        processName: inProcess.name,
        stepId: step.uniqueId,
    }));

    actions.push(state => addStep(state, {
        inProcessName: inProcess.name,
        stepProcessName: step.process.name,
        x: step.x,
        y: step.y,
    }));

    recreateOutgoingReturnPaths(newProcess, step, inProcess, actions);

    recreateIncomingReturnPaths(oldProcess, step, inProcess, actions);

    relinkStepParameters(
        newProcess.inputs,
        true,
        step,
        inProcess,
        actions,
        inputOrderMap
    );

    relinkStepParameters(
        newProcess.outputs,
        false,
        step,
        inProcess,
        actions,
        outputOrderMap
    );
}

function recreateOutgoingReturnPaths(
    newProcess: IUserProcess,
    recreateStep: IProcessStep,
    inProcess: IUserProcess,
    actions: ((s: IWorkspaceState) => IWorkspaceState)[]
) {
    const pathNamesToCheck = newProcess.returnPaths.length === 0
        ? [null]
        : newProcess.returnPaths;

    for (const pathName of pathNamesToCheck) {
        const existingPath = recreateStep.returnPaths.find(path => path.name === pathName);

        if (existingPath === undefined || existingPath.connection === undefined) {
            continue;
        }

        actions.push(state => setReturnPath(state, {
            inProcessName: inProcess.name,
            fromStepId: recreateStep.uniqueId,
            toStepId: existingPath.connection!.uniqueId,
            pathName: pathName,
        }));
    }
}

function recreateIncomingReturnPaths(
    oldProcess: IUserProcess,
    recreateStep: IProcessStep,
    inProcess: IUserProcess,
    actions: ((s: IWorkspaceState) => IWorkspaceState)[]
) {
    for (const fromStep of inProcess.steps) {
        if (fromStep === recreateStep || !usesOutputs(fromStep)
            || (isProcessStep(fromStep) && fromStep.process === oldProcess)) {
            continue;
        }

        for (const returnPath of fromStep.returnPaths) {
            if (returnPath.connection !== recreateStep) {
                continue;
            }

            actions.push(state => setReturnPath(state, {
                inProcessName: inProcess.name,
                fromStepId: fromStep.uniqueId,
                toStepId: recreateStep.uniqueId,
                pathName: returnPath.name,
            }));
        }
    }
}

function relinkStepParameters(
    newProcessParameters: IParameter[],
    isInput: boolean,
    recreateStep: IProcessStep,
    inProcess: IUserProcess,
    actions: ((s: IWorkspaceState) => IWorkspaceState)[],
    paramOrderMap: Array<number | undefined>
) {
    const oldStepParameters = isInput
        ? recreateStep.inputs
        : recreateStep.outputs;

    for (let index = 0; index< newProcessParameters.length; index++) {
        const param = newProcessParameters[index];
        const oldParamIndex = paramOrderMap[index];

        if (oldParamIndex === undefined) {
            continue;
        }

        const existingParam = oldStepParameters[oldParamIndex];

        if (existingParam.connection === undefined) {
            continue;
        }

        const varName = existingParam.connection.name;

        actions.push(state => linkVariable(state, {
            inProcessName: inProcess.name,
            stepId: recreateStep.uniqueId,
            stepParamName: param.name,
            stepInputParam: isInput,
            varName,
        }));
    }
}