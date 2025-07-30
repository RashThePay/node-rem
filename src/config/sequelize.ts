export {};
const { Sequelize } = require('sequelize');
const { postgres, env } = require('./vars');

// Create Sequelize instance
const sequelize = new Sequelize(
  postgres.database,
  postgres.username,
  postgres.password,
  {
    host: postgres.host,
    port: postgres.port,
    dialect: postgres.dialect,
    logging: postgres.logging,
    pool: postgres.pool,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to PostgreSQL database:', error);
    process.exit(-1);
  }
};

/**
 * Connect to PostgreSQL database
 *
 * @returns {object} Sequelize connection
 * @public
 */
exports.connect = async () => {
  await testConnection();
  return sequelize;
};

exports.sequelize = sequelize;
