import { MailerSend, EmailParams as MSEmailParams, Sender, Recipient } from 'mailersend';

const apiKey = process.env.MAILERSEND_API_KEY;

if (!apiKey) {
    console.warn('WARNING: MAILERSEND_API_KEY environment variable is not set. Email sending will not work.');
}

const mailerSend = apiKey ? new MailerSend({ apiKey }) : null;

interface EmailParams {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}

export const sendEmail = async (params: EmailParams): Promise<boolean> => {
    if (!mailerSend) {
        console.error('MailerSend API key not configured. Cannot send email.');
        return false;
    }

    const { to, subject, text, html } = params;

    if (!text && !html) {
        console.error('Email must have either text or html content.');
        return false;
    }

    const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'noreply@trial-3vz9dlezxze4kj50.mlsender.net';
    const fromName = process.env.MAILERSEND_FROM_NAME || 'NOC AI';

    const sentFrom = new Sender(fromEmail, fromName);

    const recipients = Array.isArray(to)
        ? to.map((email) => new Recipient(email))
        : [new Recipient(to)];

    const emailParams = new MSEmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(subject);

    if (html) {
        emailParams.setHtml(html);
    }

    if (text) {
        emailParams.setText(text);
    }

    try {
        await mailerSend.email.send(emailParams);
        console.log(`Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const isMailerSendConfigured = (): boolean => {
    return !!apiKey;
};
