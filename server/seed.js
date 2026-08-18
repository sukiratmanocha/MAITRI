/**
 * seed.js
 * ─────────────────────────────────────────────────────────
 * Inserts all existing seed data (15 imports + 15 exports)
 * into the MongoDB `shipments` collection using upsert
 * so it can be re-run safely without duplicating records.
 *
 * Usage:  node seed.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Shipment from './models/Shipment.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/maitri';

// ── Seed data (copied from src/data/shipments.js) ──────────────────────────────

const imports = [
    { id: 'IMP-2026-001', origin: 'Jebel Ali', destination: 'JNPA', vessel: 'Maersk Seletar', cargoType: 'Electronics', billOfEntry: 'BOE-78451', status: 'in_transit', date: '2026-07-24', containers: 120, weight: '1,450 MT' },
    { id: 'IMP-2026-002', origin: 'Khalifa', destination: 'JNPA', vessel: 'CMA CGM Titus', cargoType: 'Petrochemicals', billOfEntry: 'BOE-78452', status: 'cleared', date: '2026-07-23', containers: 85, weight: '2,100 MT' },
    { id: 'IMP-2026-003', origin: 'Jebel Ali', destination: 'Kandla', vessel: 'Hyundai Fortune', cargoType: 'Machinery', billOfEntry: 'BOE-78453', status: 'pending', date: '2026-07-24', containers: 45, weight: '890 MT' },
    { id: 'IMP-2026-004', origin: 'Khalifa', destination: 'JNPA', vessel: 'ZIM Sammy Ofer', cargoType: 'Auto Parts', billOfEntry: 'BOE-78454', status: 'in_transit', date: '2026-07-24', containers: 200, weight: '3,200 MT' },
    { id: 'IMP-2026-005', origin: 'Jebel Ali', destination: 'DPA', vessel: 'ONE Apus', cargoType: 'Textiles', billOfEntry: 'BOE-78455', status: 'under_inspection', date: '2026-07-22', containers: 60, weight: '720 MT' },
    { id: 'IMP-2026-006', origin: 'Jebel Ali', destination: 'JNPA', vessel: 'MSC Marina', cargoType: 'Consumer Goods', billOfEntry: 'BOE-78456', status: 'cleared', date: '2026-07-21', containers: 150, weight: '1,800 MT' },
    { id: 'IMP-2026-007', origin: 'Khalifa', destination: 'Kandla', vessel: 'OOCL Atlanta', cargoType: 'Chemicals', billOfEntry: 'BOE-78457', status: 'in_transit', date: '2026-07-24', containers: 30, weight: '650 MT' },
    { id: 'IMP-2026-008', origin: 'Jebel Ali', destination: 'JNPA', vessel: 'Yang Ming Unity', cargoType: 'Pharmaceuticals', billOfEntry: 'BOE-78458', status: 'pending', date: '2026-07-24', containers: 22, weight: '180 MT' },
    { id: 'IMP-2026-009', origin: 'Khalifa', destination: 'DPA', vessel: 'Ever Given', cargoType: 'Steel', billOfEntry: 'BOE-78459', status: 'cleared', date: '2026-07-20', containers: 95, weight: '4,500 MT' },
    { id: 'IMP-2026-010', origin: 'Jebel Ali', destination: 'JNPA', vessel: 'Cosco Shipping Rose', cargoType: 'Food Products', billOfEntry: 'BOE-78460', status: 'under_inspection', date: '2026-07-23', containers: 40, weight: '520 MT' },
    { id: 'IMP-2026-011', origin: 'Jebel Ali', destination: 'Kandla', vessel: 'Maersk Seletar', cargoType: 'Plastics', billOfEntry: 'BOE-78461', status: 'in_transit', date: '2026-07-24', containers: 75, weight: '980 MT' },
    { id: 'IMP-2026-012', origin: 'Khalifa', destination: 'JNPA', vessel: 'CMA CGM Titus', cargoType: 'Construction Materials', billOfEntry: 'BOE-78462', status: 'cleared', date: '2026-07-19', containers: 110, weight: '5,200 MT' },
    { id: 'IMP-2026-013', origin: 'Jebel Ali', destination: 'DPA', vessel: 'MSC Marina', cargoType: 'Textile Machinery', billOfEntry: 'BOE-78463', status: 'pending', date: '2026-07-24', containers: 18, weight: '340 MT' },
    { id: 'IMP-2026-014', origin: 'Khalifa', destination: 'Kandla', vessel: 'Hyundai Fortune', cargoType: 'Fertilizers', billOfEntry: 'BOE-78464', status: 'in_transit', date: '2026-07-23', containers: 55, weight: '2,800 MT' },
    { id: 'IMP-2026-015', origin: 'Jebel Ali', destination: 'JNPA', vessel: 'ONE Apus', cargoType: 'Medical Equipment', billOfEntry: 'BOE-78465', status: 'cleared', date: '2026-07-18', containers: 12, weight: '95 MT' },
];

const exports_ = [
    { id: 'EXP-2026-001', origin: 'JNPA', destination: 'Jebel Ali', vessel: 'MSC Marina', cargoType: 'Textiles & Garments', shippingBill: 'SB-45201', egmStatus: 'filed', status: 'loading', date: '2026-07-24', containers: 180, weight: '2,100 MT' },
    { id: 'EXP-2026-002', origin: 'JNPA', destination: 'Khalifa', vessel: 'OOCL Atlanta', cargoType: 'Spices & Food', shippingBill: 'SB-45202', egmStatus: 'filed', status: 'in_transit', date: '2026-07-23', containers: 95, weight: '1,150 MT' },
    { id: 'EXP-2026-003', origin: 'Kandla', destination: 'Jebel Ali', vessel: 'Ever Given', cargoType: 'Chemicals', shippingBill: 'SB-45203', egmStatus: 'pending', status: 'in_transit', date: '2026-07-24', containers: 70, weight: '1,800 MT' },
    { id: 'EXP-2026-004', origin: 'DPA', destination: 'Jebel Ali', vessel: 'Cosco Shipping Rose', cargoType: 'Cotton & Yarn', shippingBill: 'SB-45204', egmStatus: 'filed', status: 'loading', date: '2026-07-24', containers: 130, weight: '1,560 MT' },
    { id: 'EXP-2026-005', origin: 'JNPA', destination: 'Khalifa', vessel: 'Yang Ming Unity', cargoType: 'Auto Components', shippingBill: 'SB-45205', egmStatus: 'filed', status: 'cleared', date: '2026-07-22', containers: 45, weight: '620 MT' },
    { id: 'EXP-2026-006', origin: 'JNPA', destination: 'Jebel Ali', vessel: 'Maersk Seletar', cargoType: 'Pharmaceuticals', shippingBill: 'SB-45206', egmStatus: 'filed', status: 'cleared', date: '2026-07-21', containers: 30, weight: '240 MT' },
    { id: 'EXP-2026-007', origin: 'Kandla', destination: 'Khalifa', vessel: 'OOCL Atlanta', cargoType: 'Agri Products', shippingBill: 'SB-45207', egmStatus: 'pending', status: 'pending', date: '2026-07-24', containers: 85, weight: '2,400 MT' },
    { id: 'EXP-2026-008', origin: 'JNPA', destination: 'Jebel Ali', vessel: 'CMA CGM Titus', cargoType: 'Engineering Goods', shippingBill: 'SB-45208', egmStatus: 'filed', status: 'in_transit', date: '2026-07-23', containers: 65, weight: '1,050 MT' },
    { id: 'EXP-2026-009', origin: 'DPA', destination: 'Khalifa', vessel: 'Hyundai Fortune', cargoType: 'Ceramics', shippingBill: 'SB-45209', egmStatus: 'filed', status: 'cleared', date: '2026-07-20', containers: 40, weight: '880 MT' },
    { id: 'EXP-2026-010', origin: 'JNPA', destination: 'Jebel Ali', vessel: 'ONE Apus', cargoType: 'IT Hardware', shippingBill: 'SB-45210', egmStatus: 'filed', status: 'cleared', date: '2026-07-19', containers: 25, weight: '310 MT' },
    { id: 'EXP-2026-011', origin: 'Kandla', destination: 'Jebel Ali', vessel: 'ZIM Sammy Ofer', cargoType: 'Salt & Minerals', shippingBill: 'SB-45211', egmStatus: 'pending', status: 'loading', date: '2026-07-24', containers: 200, weight: '8,500 MT' },
    { id: 'EXP-2026-012', origin: 'JNPA', destination: 'Khalifa', vessel: 'MSC Marina', cargoType: 'Leather Goods', shippingBill: 'SB-45212', egmStatus: 'filed', status: 'in_transit', date: '2026-07-22', containers: 35, weight: '420 MT' },
    { id: 'EXP-2026-013', origin: 'DPA', destination: 'Jebel Ali', vessel: 'Ever Given', cargoType: 'Rice & Grains', shippingBill: 'SB-45213', egmStatus: 'filed', status: 'cleared', date: '2026-07-18', containers: 150, weight: '4,500 MT' },
    { id: 'EXP-2026-014', origin: 'JNPA', destination: 'Jebel Ali', vessel: 'Cosco Shipping Rose', cargoType: 'Gems & Jewellery', shippingBill: 'SB-45214', egmStatus: 'filed', status: 'cleared', date: '2026-07-17', containers: 8, weight: '45 MT' },
    { id: 'EXP-2026-015', origin: 'Kandla', destination: 'Khalifa', vessel: 'Hyundai Fortune', cargoType: 'Handicrafts', shippingBill: 'SB-45215', egmStatus: 'pending', status: 'pending', date: '2026-07-24', containers: 20, weight: '180 MT' },
];

// ── Seed logic ──────────────────────────────────────────────────────────────────
async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB for seeding');

    let upserted = 0;
    let skipped = 0;

    // Seed imports
    for (const imp of imports) {
        const result = await Shipment.updateOne(
            { shipmentId: imp.id },
            {
                $setOnInsert: {
                    shipmentId: imp.id,
                    type: 'import',
                    vessel: imp.vessel,
                    origin: imp.origin,
                    destination: imp.destination,
                    cargoType: imp.cargoType,
                    billOfEntry: imp.billOfEntry,
                    status: imp.status,
                    date: imp.date,
                    containers: imp.containers,
                    weight: imp.weight,
                    userSubmitted: false,
                },
            },
            { upsert: true }
        );
        if (result.upsertedCount > 0) upserted++;
        else skipped++;
    }

    // Seed exports
    for (const exp of exports_) {
        const result = await Shipment.updateOne(
            { shipmentId: exp.id },
            {
                $setOnInsert: {
                    shipmentId: exp.id,
                    type: 'export',
                    vessel: exp.vessel,
                    origin: exp.origin,
                    destination: exp.destination,
                    cargoType: exp.cargoType,
                    shippingBill: exp.shippingBill,
                    egmStatus: exp.egmStatus,
                    status: exp.status,
                    date: exp.date,
                    containers: exp.containers,
                    weight: exp.weight,
                    userSubmitted: false,
                },
            },
            { upsert: true }
        );
        if (result.upsertedCount > 0) upserted++;
        else skipped++;
    }

    console.log(`\n📦  Seeding complete!`);
    console.log(`   ✅ Inserted: ${upserted} records`);
    console.log(`   ⏭️  Skipped (already exist): ${skipped} records`);
    console.log(`   📊 Total in collection: ${await Shipment.countDocuments()}`);

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
});
