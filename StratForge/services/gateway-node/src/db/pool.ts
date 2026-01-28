import { Pool } from 'pg';
import { config } from '../config.js';

const poolConfig = config.databaseUrl
    ? { connectionString: config.databaseUrl, ssl: config.pg.ssl || undefined }
    : {
        host: config.pg.host,
        port: config.pg.port,
        user: config.pg.user,
        password: config.pg.password,
        database: config.pg.database,
        ssl: config.pg.ssl || undefined
    };

export const pool = new Pool(poolConfig);

