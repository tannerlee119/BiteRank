const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function migrateLabels() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding labels column to reviews table...');
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS labels text[]`;
    console.log('Labels column added successfully!');

    // Check if the column was added
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'reviews' AND column_name = 'labels'
    `;

    if (result.length > 0) {
      console.log('Verified: labels column exists with type:', result[0].data_type);
    } else {
      console.log('Warning: labels column not found after migration');
    }

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Labels column already exists, skipping migration');
    } else {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

migrateLabels().then(() => {
  console.log('Migration completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});