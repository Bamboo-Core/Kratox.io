
// WARNING: This is a simplified and insecure way to handle credentials for demonstration purposes.
// In a production environment, you should use a secure vault service like HashiCorp Vault,
// AWS Secrets Manager, or Google Cloud Secret Manager.

// Ensure DEVICE_SSH_USERNAME is set.
if (!process.env.DEVICE_SSH_USERNAME) {
  console.warn('WARNING: DEVICE_SSH_USERNAME environment variable is not set. SSH command execution will likely fail.');
}

// Ensure DEVICE_SSH_PASSWORD is set.
if (!process.env.DEVICE_SSH_PASSWORD) {
  console.warn('WARNING: DEVICE_SSH_PASSWORD environment variable is not set. SSH command execution will likely fail.');
}

export const deviceCredentials = {
  username: process.env.DEVICE_SSH_USERNAME || 'defaultuser',
  password: process.env.DEVICE_SSH_PASSWORD || 'defaultpass',
};
