
import axios from 'axios';

// A URL para o seu novo microserviço Python.
// Carregada a partir das variáveis de ambiente.
const NETMIKO_API_URL = process.env.NETMIKO_API_URL;

if (!NETMIKO_API_URL) {
  console.warn('WARNING: NETMIKO_API_URL environment variable is not set. Remote command execution will fail.');
}

// Pega as credenciais do ambiente do Node.js para enviar ao microserviço
const DEVICE_SSH_USERNAME = process.env.DEVICE_SSH_USERNAME;
const DEVICE_SSH_PASSWORD = process.env.DEVICE_SSH_PASSWORD;

interface ExecuteCommandPayload {
  host: string;
  device_type: string;
  command: string;
  username?: string; // Adicionado
  password?: string; // Adicionado
}

interface NetmikoResponse {
    output?: string;
    error?: string;
}

/**
 * Chama o microserviço Python/Netmiko para executar um comando.
 * @param payload - Os dados necessários para a execução do comando.
 * @returns O resultado do comando retornado pelo microserviço.
 */
export async function executeCommandViaNetmiko(payload: ExecuteCommandPayload): Promise<string> {
  if (!NETMIKO_API_URL) {
    throw new Error('Netmiko service URL is not configured.');
  }
  if (!DEVICE_SSH_USERNAME || !DEVICE_SSH_PASSWORD) {
      console.error('Missing DEVICE_SSH_USERNAME or DEVICE_SSH_PASSWORD in the Node.js environment.');
      throw new Error('Device SSH credentials are not configured on the application server.');
  }

  // Adiciona as credenciais ao payload antes de enviar
  const fullPayload: ExecuteCommandPayload = {
    ...payload,
    username: DEVICE_SSH_USERNAME,
    password: DEVICE_SSH_PASSWORD,
  };

  try {
    const response = await axios.post<NetmikoResponse>(`${NETMIKO_API_URL}/execute-command`, fullPayload, {
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
        // Se o microserviço retornou um erro específico, repasse-o
        const serviceError = error.response.data?.error || `Request failed with status ${error.response.status}`;
        throw new Error(serviceError);
    }
    // Erro genérico de rede/conexão
    throw new Error('Failed to communicate with the network automation service.');
  }
}
