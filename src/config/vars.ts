export {};
const path = require('path');

// import .env variables
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env'),
  sample: path.join(__dirname, '../../.env.example'),
  allowEmptyValues: true
});

const env = process.env; // this has ".env" keys & values
// let adminToken = '';

module.exports = {
  env: env.NODE_ENV,
  port: env.PORT,
  socketEnabled: ['1', 'true', 'yes'].indexOf(env.SOCKET_ENABLED || '') >= 0,
  slackEnabled: env.SLACK_WEBHOOK_URL ? true : false,
  emailEnabled: env.EMAIL_MAILGUN_API_KEY ? true : false,
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRATION_MINUTES: env.JWT_EXPIRATION_MINUTES,
  UPLOAD_LIMIT: 5, // MB
  SLACK_WEBHOOK_URL: env.SLACK_WEBHOOK_URL,
  EMAIL_TEMPLATE_BASE: './src/templates/emails/',
  EMAIL_FROM_SUPPORT: env.EMAIL_FROM_SUPPORT,
  EMAIL_MAILGUN_API_KEY: env.EMAIL_MAILGUN_API_KEY,
  EMAIL_MAILGUN_DOMAIN: env.EMAIL_MAILGUN_DOMAIN,
  SEC_ADMIN_EMAIL: env.SEC_ADMIN_EMAIL,
  // setAdminToken: (admToken: string) => (adminToken = admToken),
  isAdmin: (user: any) => user && user.email === env.SEC_ADMIN_EMAIL,
  postgres: {
    host: env.POSTGRES_HOST || 'localhost',
    port: env.POSTGRES_PORT || 5432,
    database: env.NODE_ENV === 'test' ? env.POSTGRES_DB_TEST : env.POSTGRES_DB,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    dialect: 'postgres',
    logging: env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  logs: env.NODE_ENV === 'production' ? 'combined' : 'dev'
};
