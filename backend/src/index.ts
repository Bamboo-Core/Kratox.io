
import 'dotenv/config';
import express, { type Application } from 'express';
import cors from 'cors';
import dnsRoutes from './routes/dns-routes.js';

// Configuração do CORS lendo da variável de ambiente ALLOWED_ORIGINS
// If the variable is not defined, an empty array is used.
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

// CORS Configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allows requests without an origin (like same-server requests) or checks if the origin is in the allowed list.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    } 
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], // Added DELETE
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const app: Application = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Monta o roteador de DNS nas rotas que começam com /api/dns
app.use('/api/dns', dnsRoutes);

// Start Server
const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
