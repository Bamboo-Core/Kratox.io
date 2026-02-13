"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommandViaNetmiko = executeCommandViaNetmiko;
const axios_1 = __importDefault(require("axios"));
// The URL for your new Python microservice.
// Loaded from environment variables.
const NETMIKO_API_URL = process.env.NETMIKO_API_URL;
if (!NETMIKO_API_URL) {
    console.warn('WARNING: NETMIKO_API_URL environment variable is not set. Remote command execution will fail.');
}
/**
 * Calls the Python/Netmiko microservice to execute a command.
 * @param payload - The data required for the command execution, including credentials.
 * @returns The command output returned by the microservice.
 */
async function executeCommandViaNetmiko(payload) {
    if (!NETMIKO_API_URL) {
        throw new Error('Netmiko service URL is not configured.');
    }
    try {
        // Corrected: Pass payload directly as the data object for axios.
        const response = await axios_1.default.post(`${NETMIKO_API_URL}/execute-command`, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.data.error) {
            throw new Error(`Netmiko service error: ${response.data.error}`);
        }
        return response.data.output || '';
    }
    catch (error) {
        console.error('[Netmiko Service] Error calling Netmiko microservice:', error);
        if (axios_1.default.isAxiosError(error) && error.response) {
            // If the microservice returned a specific error, pass it on
            const serviceError = error.response.data?.error || `Request failed with status ${error.response.status}`;
            throw new Error(serviceError);
        }
        // Generic network/connection error
        throw new Error('Failed to communicate with the network automation service.');
    }
}
