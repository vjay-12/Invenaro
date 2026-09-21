import 'dotenv/config';
import { app } from './server.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Invenaro API server running on port ${PORT}`);
});
