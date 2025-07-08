
import 'dotenv/config';
import express, { type Application } from 'express';
import cors from 'cors';
import dnsRoutes from './routes/dns-routes.js';

const app: Application = express();

// Middleware
// Temporarily allowing all origins to rule out CORS issues.
// This is a debugging step.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the DNS router on routes starting with /api/dns
app.use('/api/dns', dnsRoutes);

// Start Server
const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
