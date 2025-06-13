const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

console.log('Testing database connection...');
console.log('Connection string format:', connectionString.substring(0, 20) + '...');

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('✓ Database connection successful:', result);
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();