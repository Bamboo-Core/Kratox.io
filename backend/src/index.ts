
import 'dotenv/config';
import express, { type Application } from 'express';
import cors from 'cors';
import dnsRoutes from './routes/dns-routes';

const app: Application = express();
const port = process.env.PORT || 4001;

// Middleware
app.use(cors({
  origin: 'http://localhost:9002', // Allow requests from your frontend origin
  methods: ['GET', 'POST', 'OPTIONS'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
}));


app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/dns', dnsRoutes);

// Start Server
app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
