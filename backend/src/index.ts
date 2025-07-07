
import 'dotenv/config';
import express, { type Application } from 'express';
import cors from 'cors';
import dnsRoutes from './routes/dns-routes.js';

const app: Application = express();
const port = process.env.PORT || 4001;

// Reads allowed origins from the environment variable and splits them into an array.
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

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/dns', dnsRoutes);

// Start Server
app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
