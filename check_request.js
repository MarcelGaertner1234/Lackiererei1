// Quick script to check request data structure
const admin = require('firebase-admin');

// Initialize with demo project for emulator
admin.initializeApp({
  projectId: 'demo-test'
});

const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false
});

async function checkRequest() {
  try {
    const snapshot = await db.collection('partnerAnfragen_mosbach').where('id', '==', 'req_1763226683705').get();
    if (snapshot.empty) {
      console.log('❌ Request not found');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log('📋 Request Data:');
    console.log('  serviceTyp:', data.serviceTyp);
    console.log('  serviceLabels:', data.serviceLabels);
    console.log('  serviceData keys:', data.serviceData ? Object.keys(data.serviceData) : 'undefined');
    console.log('  fahrzeugId:', data.fahrzeugId);
    
    if (data.fahrzeugId) {
      const fahrzeugDoc = await db.collection('fahrzeuge_mosbach').doc(data.fahrzeugId).get();
      if (fahrzeugDoc.exists) {
        const fahrzeugData = fahrzeugDoc.data();
        console.log('\n🚗 Fahrzeug Data:');
        console.log('  serviceTyp:', fahrzeugData.serviceTyp);
        console.log('  additionalServices:', fahrzeugData.additionalServices);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkRequest();
