/* 'use client';

import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppFloatingButton() {
    const phoneNumber = '00000000000';
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre Kratox.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center animate-in slide-in-from-bottom-5 fade-in duration-500"
            aria-label="Fale conosco no WhatsApp"
        >
            <FaWhatsapp size={32} />
        </a>
    );
} */
