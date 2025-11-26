
'use server';

import axios from 'axios';

/**
 * Simula o envio de uma mensagem de WhatsApp para fins de teste.
 * Apenas exibe a mensagem no console do servidor.
 */
async function sendWithMock(to: string, message: string): Promise<void> {
  console.log(`[WHATSAPP MOCK] Sending to ${to}: "${message}"`);
  // Simula uma pequena demora de rede
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Envia uma mensagem de WhatsApp usando a API da GZappy.
 */
async function sendWithGzappy(to: string, message: string): Promise<void> {
  const userToken = process.env.GZAPPY_USER_TOKEN;
  const instanceId = process.env.GZAPPY_INSTANCE_ID;

  if (!userToken || !instanceId || userToken === 'SEU_TOKEN_DE_USUARIO_AQUI') {
    throw new Error('As credenciais da GZappy (user token e instance ID) não estão configuradas no arquivo .env do backend.');
  }

  // A GZappy espera que o número esteja no formato '55DDDNUMERO'
  const formattedTo = to.replace(/\D/g, '');

  try {
    await axios.post(
      'https://api.gzappy.com/v1/message/send-message',
      {
        instance_id: instanceId,
        instance_token: userToken,
        message: message,
        phone: formattedTo,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
     console.log(`[GZAPPY] Mensagem enviada com sucesso para ${formattedTo}.`);
  } catch (error) {
    console.error('[GZAPPY] Erro ao enviar mensagem:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Erro da API GZappy: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('Falha na comunicação com a API da GZappy.');
  }
}

/**
 * Função principal para enviar mensagens de WhatsApp.
 * Ela seleciona o provedor com base na variável de ambiente WHATSAPP_PROVIDER.
 * O padrão é 'MOCK' se a variável não estiver definida.
 */
export async function sendWhatsappMessage(to: string, message: string): Promise<void> {
  const provider = process.env.WHATSAPP_PROVIDER || 'MOCK';
  console.log(`[WhatsApp Service] Usando o provedor: ${provider}`);

  switch (provider) {
    case 'GZAPPY':
      return await sendWithGzappy(to, message);
    case 'MOCK':
    default:
      return await sendWithMock(to, message);
  }
}
