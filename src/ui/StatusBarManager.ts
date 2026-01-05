import * as vscode from 'vscode';
import { COMMAND_SETUP, COMMAND_SHOW_SYNC_STATUS, COMMAND_SYNC } from '../constants';

export enum StatusBarState {
    NOT_SET_UP = "NOT_SET_UP",
    DISABLED = "DISABLED",
    SYNCED = "SYNCED",
    UNABLE_TO_SYNC = "OUT_OF_SYNC",
    SYNCING = "SYNCING",
    ERROR = "ERROR",
    NO_WORKSPACE = "NO_WORKSPACE",
}

type StatusBarStateConfig = {
    text: string,
    tooltip?: string,
    command?: string,
    color?: string,
}

const stateToConfig: { [key in StatusBarState]: StatusBarStateConfig } = {
    NOT_SET_UP: {
        text: "$(alert) Set up Provena!",
        command: COMMAND_SETUP,
        color: "red",
    },
    DISABLED: {
        text: "$(circle-slash) Provena disabled",
        tooltip: "Provena is disabled and not recording your work. Click to set up.",
        command: COMMAND_SETUP,
    },
    SYNCED: {
        text: "$(check) Provena synced",
        command: COMMAND_SHOW_SYNC_STATUS,
    },
    OUT_OF_SYNC: {
        text: "$(alert) Provena out of sync",
        tooltip: "Provena is out of sync. Click to sync.",
        color: "yellow",
        command: COMMAND_SYNC,
    },
    SYNCING: {
        text: "$(sync~spin) Provena syncing",
    },
    ERROR: {
        text: "$(error) Provena sync error",
        tooltip: "Provena encountered a syncing error. Click to see more details.",
        command: COMMAND_SHOW_SYNC_STATUS,
        color: "red",
    },
    NO_WORKSPACE: {
        text: "$(circle-slash) No workspace open",
        tooltip: "No workspace is open, so Provena cannot record your work.",
    },
};

export class StatusBarManager {
    private readonly statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }

    public setState(state: StatusBarState) {
        this.statusBarItem.show();
        const { text, tooltip, command, color } = stateToConfig[state];
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip =  tooltip ?? text;
        this.statusBarItem.command = command;
        this.statusBarItem.color = color;
    }
}