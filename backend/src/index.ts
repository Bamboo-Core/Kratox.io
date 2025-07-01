
import 'dotenv/config';
import express, { type Application } from 'express';
import cors from 'cors';
import dnsRoutes from './routes/dns-routes';

const app: Application = express();
const port = process.env.PORT || 4001;

// CORS Configuration for Production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:9002', // Use env var for production
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
