// Development launcher: downloads an official MongoDB binary and uses a persistent data directory.
const path = require('node:path');
const fs = require('node:fs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { start } = require('./app');
(async () => {
  const dataDir = process.env.MONGO_DATA_DIR || path.join(__dirname, '../../.local/mongodb');
  fs.mkdirSync(dataDir, { recursive: true });
  const mongo = await MongoMemoryServer.create({
    binary: { version: '8.0.16', downloadDir: path.join(__dirname, '../../.local/mongodb-binaries') },
    instance: { dbPath: dataDir, dbName: 'driveledger', storageEngine: 'wiredTiger' }
  });
  const server = await start({ mongoUrl: mongo.getUri('driveledger') });
  async function stop() {
    server.close();
    await require('mongoose').disconnect();
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
})().catch(error => { console.error(error); process.exit(1); });
