// knexfile.mjs

console.log([
  {
    host: process.env.CROPCIRCLES_DB_HOST,
    database: process.env.CROPCIRCLES_DB_NAME,
    user: process.env.CROPCIRCLES_DB_USER,
    password: process.env.CROPCIRCLES_DB_PASS,
  },
]);

/**
 * @type {import('knex').Knex.Config}
 */
const config = {
  client: "postgresql",
  connection: {
    host: process.env.CROPCIRCLES_DB_HOST,
    database: process.env.CROPCIRCLES_DB_NAME,
    user: process.env.CROPCIRCLES_DB_USER,
    password: process.env.CROPCIRCLES_DB_PASS,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: "knex_migrations",
    directory: "./database/migrations",
    loadExtensions: [".mjs"], // Add this line to load .mjs migration files
  },
  seeds: {
    directory: "./database/seeds",
    loadExtensions: [".mjs"], // Add this line to load .mjs seed files
  },
};

export default config;
