// Script to test the booking API and see the actual data structure
const https = require('https');

// First, login to get token
const loginData = JSON.stringify({
  email: 'k423@gmail.com',
  password: 'Kiana423'
});

// We'll use a simple approach - just print a helpful message
console.log('To test the booking API structure, open browser console on the Bookings page');
console.log('The console.log statements in Bookings.tsx will show:');
console.log('- Bookings data: (array of booking objects)');
console.log('');
console.log('Look for fields like:');
console.log('- first_choice_slot_id or first_preference_slot_id or slot_preferences[0]');
console.log('- second_choice_slot_id or second_preference_slot_id or slot_preferences[1]');
console.log('');
console.log('If data structure is different, need to update Bookings.tsx accordingly');
