
import 'dotenv/config';
import express, { type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import dnsRoutes from './routes/dns-routes.js';
import authRoutes from './routes/auth-routes.js';

const app: Application = express();

// --- CORS Configuration ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the auth and DNS routers
app.use('/api/auth', authRoutes);
app.use('/api/dns', dnsRoutes);

// --- Start Server ---
const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
