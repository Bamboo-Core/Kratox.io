"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMailerSendConfigured = exports.sendEmail = void 0;
const mailersend_1 = require("mailersend");
const apiKey = process.env.MAILERSEND_API_KEY;
if (!apiKey) {
    console.warn('WARNING: MAILERSEND_API_KEY environment variable is not set. Email sending will not work.');
}
const mailerSend = apiKey ? new mailersend_1.MailerSend({ apiKey }) : null;
const sendEmail = async (params) => {
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
    const sentFrom = new mailersend_1.Sender(fromEmail, fromName);
    const recipients = Array.isArray(to)
        ? to.map((email) => new mailersend_1.Recipient(email))
        : [new mailersend_1.Recipient(to)];
    const emailParams = new mailersend_1.EmailParams()
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
    }
    catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
exports.sendEmail = sendEmail;
const isMailerSendConfigured = () => {
    return !!apiKey;
};
exports.isMailerSendConfigured = isMailerSendConfigured;
