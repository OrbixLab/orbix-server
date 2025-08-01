import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import { pool } from './db.js';

dotenv.config();

// Configuración de AWS SES
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: 'us-east-1' // Cambia si usás otra región
});
const ses = new AWS.SES();

async function sendBulkEmails() {
    try {
        const [rows] = await pool.query('SELECT email FROM subscribers');

        for (let { email } of rows) {
            const params = {
                Source: process.env.SES_EMAIL, // Email verificado en SES
                Destination: { ToAddresses: [email] },
                Message: {
                    Subject: { Data: 'Novedades de Orbix 🚀' },
                    Body: {
                        Text: { Data: '¡Gracias por suscribirte a Orbix! Muy pronto más noticias.' }
                    }
                }
            };

            await ses.sendEmail(params).promise();
            console.log(`✅ Email enviado a: ${email}`);
        }

        console.log(`📨 ${rows.length} correos enviados correctamente.`);
    } catch (error) {
        console.error('❌ Error enviando correos:', error);
    } finally {
        pool.end();
    }
}

sendBulkEmails();
