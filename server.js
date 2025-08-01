import express from 'express';
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();
const app = express();
app.use(express.json());

// Guardar email
app.post('/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Email inválido' });
    }
    try {
        await pool.execute('INSERT INTO subscribers (email) VALUES (?)', [email]);
        res.json({ message: 'Email registrado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya registrado' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error guardando el email' });
    }
});

// Cantidad de suscriptores
app.get('/subscribers/count', async (req, res) => {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM subscribers');
    res.json({ total: rows[0].total });
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));
