import 'dotenv/config';
import { createTransport } from 'nodemailer';
import { createConnection } from 'mysql2/promise';

// Variables de entorno
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_LIMIT = parseInt(process.env.EMAIL_LIMIT, 10) || 2000;

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

// Crear transporte SMTP para Google Workspace
const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Función para esperar (delay)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log(`📨 Conectando a base de datos ${DB_NAME}...`);

  // Conexión a MySQL
  const connection = await createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME
  });

  console.log(`✅ Conectado a la base de datos`);

  // Obtener lista de correos a enviar (no unsubscribed y no enviados antes)
  const [rows] = await connection.execute(`
    SELECT email FROM usuarios
    WHERE unsubscribed = 0
      AND (last_sent IS NULL)
      AND email IS NOT NULL
    LIMIT ?
  `, [EMAIL_LIMIT]);

  if (rows.length === 0) {
    console.warn("⚠ No se encontraron correos pendientes para enviar.");
    await connection.end();
    return;
  }

  console.log(`📦 Correos pendientes: ${rows.length}`);

  let sentCount = 0;

  for (const row of rows) {
    if (sentCount >= EMAIL_LIMIT) {
      console.warn(`⚠ Límite diario (${EMAIL_LIMIT}) alcanzado. Deteniendo envío.`);
      break;
    }

    const recipient = row.email;

    let mailOptions = {
      from: EMAIL_USER,
      to: recipient,
      subject: "Hola desde Orbix 🚀",
      html: `
        <h1>Hola desde Orbix 🚀</h1>
        <p>Este es un correo de prueba.</p>
        <p style="font-size:12px;color:gray;">
          Si no querés recibir más correos, <a href="https://tu-dominio.com/unsubscribe?email=${encodeURIComponent(recipient)}">haz clic aquí</a>.
        </p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      sentCount++;

      // Marcar en la base que ya se envió
      await connection.execute(
        "UPDATE usuarios SET last_sent = NOW() WHERE email = ?",
        [recipient]
      );

      console.log(`✅ Enviado a: ${recipient} (${sentCount}/${EMAIL_LIMIT})`);
    } catch (err) {
      console.error(`❌ Error enviando a ${recipient}: ${err.message}`);
    }

    // Esperar 1 segundo entre envíos
    await delay(1000);
  }

  console.log(`📬 Proceso finalizado. Correos enviados: ${sentCount}`);
  await connection.end();
}

main().catch(err => {
  console.error("❌ Error general:", err);
});
