import sgMail from '@sendgrid/mail';

const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (!sendgridApiKey) {
    console.warn('WARNING: SENDGRID_API_KEY environment variable is not set. Email sending will not work.');
}

if (sendgridApiKey) {
    sgMail.setApiKey(sendgridApiKey);
}

interface EmailParams {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}

export const sendEmail = async (params: EmailParams): Promise<boolean> => {
    if (!sendgridApiKey) {
        console.error('SendGrid API key not configured. Cannot send email.');
        return false;
    }

    const { to, subject, text, html } = params;

    if (!text && !html) {
        console.error('Email must have either text or html content.');
        return false;
    }

    const msg: sgMail.MailDataRequired = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@noc-ia.app',
        subject,
        text: text || '',
        html: html || '',
    };

    try {
        await sgMail.send(msg);
        console.log(`Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const isSendGridConfigured = (): boolean => {
    return !!sendgridApiKey;
};
