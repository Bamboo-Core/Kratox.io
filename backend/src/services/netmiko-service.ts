
import axios from 'axios';

// The URL for your new Python microservice.
// Loaded from environment variables.
const NETMIKO_API_URL = process.env.NETMIKO_API_URL;

if (!NETMIKO_API_URL) {
  console.warn('WARNING: NETMIKO_API_URL environment variable is not set. Remote command execution will fail.');
}

// This interface now includes username and password, as required by the Python microservice.
interface ExecuteCommandPayload {
  host: string;
  device_type: string;
  command: string;
  username?: string;
  password?: string;
  port?: number;
}

interface NetmikoResponse {
    output?: string;
    error?: string;
}

/**
 * Calls the Python/Netmiko microservice to execute a command.
 * @param payload - The data required for the command execution, including credentials.
 * @returns The command output returned by the microservice.
 */
export async function executeCommandViaNetmiko(payload: ExecuteCommandPayload): Promise<string> {
  if (!NETMIKO_API_URL) {
    throw new Error('Netmiko service URL is not configured.');
  }
 
  try {
    const response = await axios.post<NetmikoResponse>(`${NETMIKO_API_URL}/execute-command`, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.error) {
      throw new Error(`Netmiko service error: ${response.data.error}`);
    }
    
    return response.data.output || '';

  } catch (error) {
    console.error('[Netmiko Service] Error calling Netmiko microservice:', error);
    if (axios.isAxiosError(error) && error.response) {
        // If the microservice returned a specific error, pass it on
        const serviceError = error.response.data?.error || `Request failed with status ${error.response.status}`;
        throw new Error(serviceError);
    }
    // Generic network/connection error
    throw new Error('Failed to communicate with the network automation service.');
  }
}

    