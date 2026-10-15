async function test() {
  console.log('--- 1. Testing UPI Verification ---');
  const upiRes = await fetch('http://localhost:3000/api/upi/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upiId: 'alex@okaxis', name: 'Alex' }),
  });
  const upiData = await upiRes.json();
  console.log('UPI Verify Result:', JSON.stringify(upiData, null, 2));

  console.log('\n--- 2. Testing Invalid UPI Syntax ---');
  const invalidRes = await fetch('http://localhost:3000/api/upi/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upiId: 'not-an-upi-id' }),
  });
  const invalidData = await invalidRes.json();
  console.log('Invalid UPI Result:', JSON.stringify(invalidData, null, 2));

  console.log('\n--- 3. Testing Bill Creation with Server-side Math ---');
  const billRes = await fetch('http://localhost:3000/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerId: 'owner-alex',
      merchantName: 'Bombay Social',
      title: 'Friday Dinner',
      items: [
        { name: 'Paneer Butter Masala', quantity: 2, unitPricePaise: 25000, totalPricePaise: 50000 },
        { name: 'Garlic Naan', quantity: 4, unitPricePaise: 6000, totalPricePaise: 24000 },
      ],
      taxPaise: 3700,
      discountPaise: 2000,
      serviceChargePaise: 1000,
    }),
  });
  const billData = await billRes.json();
  console.log('Created Bill:', JSON.stringify({
    id: billData.data.id,
    merchantName: billData.data.merchantName,
    subtotalPaise: billData.data.subtotalPaise,
    totalPaise: billData.data.totalPaise,
    shareToken: billData.data.shareToken,
  }, null, 2));

  console.log('\n--- 4. Testing Share Token Lookup ---');
  const tokenRes = await fetch(`http://localhost:3000/api/bills/share/${billData.data.shareToken}`);
  const tokenData = await tokenRes.json();
  console.log('Token Lookup Success:', tokenData.success, 'Title:', tokenData.data.title);

  console.log('\n--- 5. Testing Participant Join ---');
  const joinRes = await fetch(`http://localhost:3000/api/bills/${billData.data.id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Rahul' }),
  });
  const joinData = await joinRes.json();
  console.log('Joined Participant:', joinData.data.name, 'ID:', joinData.data.id);
}

test().catch(console.error);
