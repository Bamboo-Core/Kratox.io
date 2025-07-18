
import SSH2Promise from 'ssh2-promise';
import { deviceCredentials } from '../config/device-credentials.js';

/**
 * Executes a command on a remote device via SSH.
 * @param hostIp The IP address of the device to connect to.
 * @param command The command to execute on the device.
 * @returns A promise that resolves to the command's stdout.
 */
export async function executeCommand(hostIp: string, command: string): Promise<string> {
  const { username, password } = deviceCredentials;

  const sshConfig = {
    host: hostIp,
    username: username,
    password: password,
    // WARNING: In a real-world scenario, you should handle host key verification properly.
    // 'force-new' can be vulnerable to man-in-the-middle attacks.
    // Consider using a known_hosts file or a function to verify the host key.
    algorithms: {
        serverHostKey: ['ssh-rsa', 'ssh-dss'] 
    }
  };

  const ssh = new SSH2Promise(sshConfig);

  try {
    console.log(`[SSH Service] Connecting to ${hostIp}...`);
    await ssh.connect();
    console.log(`[SSH Service] Connected. Executing command: "${command}"`);
    
    const output = await ssh.exec(command);
    
    console.log(`[SSH Service] Command executed successfully on ${hostIp}.`);
    return output.toString();

  } catch (error) {
    console.error(`[SSH Service] Error connecting or executing command on ${hostIp}:`, error);
    // Re-throw the error to be handled by the controller
    throw error;
  } finally {
    if (ssh.isConnected()) {
      console.log(`[SSH Service] Disconnecting from ${hostIp}.`);
      ssh.close();
    }
  }
}
