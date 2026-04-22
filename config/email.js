const { Resend } = require('resend');
require('dotenv').config();

let resend;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('Resend API Key found and initialized.');
} else {
    console.warn('WARNING: RESEND_API_KEY is missing from .env. Email features will not work.');
}

const sendEmail = async ({ to, subject, html }) => {
    try {
        if (!resend) {
            console.error('Cannot send email: RESEND_API_KEY is not configured');
            return null;
        }
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev', // Replace with your verified domain
            to,
            subject,
            html,
        });
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = { sendEmail };
