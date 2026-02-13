'use server';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsappMessage = sendWhatsappMessage;
const axios_1 = __importDefault(require("axios"));
/**
 * Simula o envio de uma mensagem de WhatsApp para fins de teste.
 * Apenas exibe a mensagem no console do servidor.
 */
async function sendWithMock(to, message) {
    console.log(`[WHATSAPP MOCK] Sending to ${to}: \"${message}\"`);
    // Simula uma pequena demora de rede
    await new Promise(resolve => setTimeout(resolve, 500));
}
/**
 * Envia uma mensagem de WhatsApp usando a API v2 da GZappy.
 */
async function sendWithGzappy(to, message) {
    const token = process.env.GZAPPY_TOKEN;
    if (!token || token === 'SEU_TOKEN_AQUI') {
        throw new Error('A credencial da GZappy (GZAPPY_TOKEN) não está configurada corretamente no ambiente.');
    }
    // A GZappy espera que o número esteja no formato '55DDDNUMERO'
    const formattedTo = to.replace(/\D/g, '');
    try {
        await axios_1.default.post('https://v2-api.gzappy.com/message/send-text', {
            phone: formattedTo,
            message: message,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        console.log(`[GZAPPY V2] Mensagem enviada com sucesso para ${formattedTo}.`);
    }
    catch (error) {
        console.error('[GZAPPY V2] Erro ao enviar mensagem:', error);
        if (axios_1.default.isAxiosError(error) && error.response) {
            // Adicionando mais detalhes do erro da API para facilitar o debug
            console.error('[GZAPPY V2] Detalhes do erro:', error.response.data);
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
async function sendWhatsappMessage(to, message) {
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
