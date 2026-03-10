const app = require('./app');
const config = require('./config/config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`LearnSphere API server listening on port ${PORT} (${config.nodeEnv})`);
});
