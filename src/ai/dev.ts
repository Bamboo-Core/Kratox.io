import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-alerts.ts';
import '@/ai/flows/suggest-rules-from-description.ts';