
import 'dotenv/config';
import express, { type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import dnsRoutes from './routes/dns-routes.js';

const app: Application = express();

// --- CORS Configuration ---
// Creates a whitelist of allowed origins from the environment variable.
// Falls back to an empty array if the variable is not set.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allows requests with no origin (like mobile apps or curl requests)
    // and requests from whitelisted origins.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Rejects requests from non-whitelisted origins.
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// --- Middleware ---
app.use(cors(corsOptions)); // Use the configured CORS options
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the DNS router on routes starting with /api/dns
app.use('/api/dns', dnsRoutes);

// --- Start Server ---
const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
