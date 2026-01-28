import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'link-state.json');

interface TenantLinkState {
    version: number;
    token?: string;
    format?: string;
}

interface LinkState {
    [tenantId: string]: TenantLinkState | number;
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf-8');
}

function readState(): LinkState {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading link-state.json:', error);
        return {};
    }
}

function writeState(state: LinkState) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing link-state.json:', error);
    }
}

export const LinkStateService = {
    getTenantVersion(tenantId: string): number {
        const state = readState();
        const tenantState = state[tenantId];
        if (typeof tenantState === 'number') return tenantState;
        return tenantState?.version || 0;
    },

    getTenantState(tenantId: string): TenantLinkState {
        const state = readState();
        const tenantState = state[tenantId];
        if (typeof tenantState === 'number') {
            return { version: tenantState };
        }
        return tenantState || { version: 0 };
    },

    saveTenantState(tenantId: string, token: string, format: string): number {
        const state = readState();
        const currentVersion = this.getTenantVersion(tenantId);
        const newVersion = currentVersion + 1;

        state[tenantId] = {
            version: newVersion,
            token,
            format
        };

        writeState(state);
        return newVersion;
    },

    incrementTenantVersion(tenantId: string): number {
        const state = readState();
        const currentVersion = this.getTenantVersion(tenantId);
        const newVersion = currentVersion + 1;

        const existing = state[tenantId];
        if (typeof existing === 'object') {
            state[tenantId] = { ...existing, version: newVersion, token: undefined };
        } else {
            state[tenantId] = { version: newVersion };
        }

        writeState(state);
        return newVersion;
    }
};