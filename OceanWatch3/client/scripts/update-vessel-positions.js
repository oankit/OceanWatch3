const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const MONGODB_URI = 'mongodb+srv://johnliu:pword@OceanWatch-main.2w2qohn.mongodb.net/main';
const DB_NAME = 'main';

class WindBorneClient {
  constructor() {
    this.clientId = 'OceanWatch';
    this.apiKey = 'wb_d4b5469ee771db4967b8398f89436adc';
    if (!this.clientId || !this.apiKey) {
      throw new Error("WB_CLIENT_ID and WB_API_KEY must be set");
    }
    this.signedToken = this.generateSignedToken();
  }
  generateSignedToken() {
    const payload = {
      client_id: this.clientId,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.apiKey, { algorithm: "HS256" });
  }
  async getRequest(url) {
    if (!this.clientId || !this.apiKey) {
      throw new Error("WB_CLIENT_ID and WB_API_KEY must be set");
    }
    const authString = `${this.clientId}:${this.signedToken}`;
    const encodedAuth = Buffer.from(authString).toString("base64");
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${encodedAuth}`,
        },
      });
      return response;
    } catch (error) {
      if (error.response) {
        const { status, statusText, data } = error.response;
        throw new Error(
          `Request failed: ${status} ${statusText} - ${typeof data === 'string' ? data : JSON.stringify(data)}`
        );
      }
      throw error;
    }
  }
}

function parseDateSafe(value) {
  if (!value) return 0;
  const s = typeof value === 'string' ? value : String(value);
  const ms = Date.parse(s);
  return isNaN(ms) ? 0 : ms;
}

function toRad(deg) { 
  return (deg * Math.PI) / 180; 
}

function toDeg(rad) { 
  return (rad * 180) / Math.PI; 
}

function normalizeBearing(deg) { 
  return (deg + 360) % 360; 
}

function computeBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return normalizeBearing(toDeg(θ));
}

async function updateVesselPositions() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const shipsCol = db.collection('vessel');
    const eventsCol = db.collection('events');
    console.log('Connected! Fetching ships...');
    const ships = await shipsCol.find({}).toArray();
    console.log(`Found ${ships.length} ships to process`);
    let updated = 0;
    let skipped = 0;
    const singlePointShips = [];
    const singlePointCoords = [];
    const shipResults = [];
    for (let idx = 0; idx < ships.length; idx++) {
      const ship = ships[idx];
      const vesselId = ship?.vessel_id;
      if (!vesselId) {
        console.log(`[${idx + 1} / ${ships.length}] Skipping ship without vessel_id: ${ship._id}`);
        skipped++;
        continue;
      }
      
      console.log(`[${idx + 1} / ${ships.length}] Processing ship: ${ship.name || vesselId}`);
      const events = await eventsCol
        .find({ vessel_id: vesselId })
        .sort({ event_end: -1, timestamp: -1 })
        .limit(2)
        .toArray();
      
      if (events.length === 0) {
        console.log(`[${idx + 1} / ${ships.length}]   No events found for ${ship.name || vesselId}`);
        // Instead of skipping, add to results with noEvents: true
        const shipResult = {
          ship,
          vesselId,
          lat: null,
          lon: null,
          bearing: 0,
          noEvents: true
        };
        shipResults.push(shipResult);
        continue;
      }
      
      const lastEvent = events[0];
      const lat = typeof lastEvent?.latitude === 'number' ? lastEvent.latitude : Number(lastEvent?.latitude);
      const lon = typeof lastEvent?.longitude === 'number' ? lastEvent.longitude : Number(lastEvent?.longitude);
      
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.log(`[${idx + 1} / ${ships.length}]   Invalid lat/lon for ${ship.name || vesselId}: lat=${lat}, lon=${lon}`);
        skipped++;
        continue;
      }
      
      let bearing = 0;
      let needsWindFallback = false;
      if (events.length >= 2) {
        const prevEvent = events[1];
        const lat2 = typeof prevEvent?.latitude === 'number' ? prevEvent.latitude : Number(prevEvent?.latitude);
        const lon2 = typeof prevEvent?.longitude === 'number' ? prevEvent.longitude : Number(prevEvent?.longitude);
        
        if (Number.isFinite(lat2) && Number.isFinite(lon2)) {
          bearing = computeBearing(lat2, lon2, lat, lon);
          console.log(`[${idx + 1} / ${ships.length}]   Calculated bearing from two positions: ${bearing.toFixed(1)}°`);
        } else {
          console.log(`[${idx + 1} / ${ships.length}]   Second position invalid, will use wind fallback`);
          needsWindFallback = true;
        }
      } else {
        console.log(`[${idx + 1} / ${ships.length}]   Only one event available, will use wind fallback`);
        needsWindFallback = true;
      }
      
      const shipResult = {
        ship,
        vesselId,
        lat,
        lon,
        bearing,
        noEvents: false
      };
      
      shipResults.push(shipResult);
      
      if (needsWindFallback) {
        singlePointShips.push(shipResults.length - 1);
        singlePointCoords.push({ lat, lon });
      }
    }
    if (singlePointCoords.length > 0) {
      console.log(`\nFetching wind data for ${singlePointCoords.length} ships with single positions...`);
      try {
        const wb = new WindBorneClient();
        const coordsParam = singlePointCoords.map((c) => `${c.lat},${c.lon}`).join(';');
        const url = `https://forecasts.windbornesystems.com/api/v1/points?coordinates=${encodeURIComponent(coordsParam)}&max_forecast_hour=3`;
        const resp = await wb.getRequest(url);
        const forecasts = resp?.data?.forecasts;
        if (Array.isArray(forecasts)) {
          for (let i = 0; i < singlePointShips.length; i++) {
            const resultIndex = singlePointShips[i];
            const series = forecasts[i];
            const first = Array.isArray(series) && series.length > 0 ? series[0] : null;
            const u = Number(first?.wind_u_10m);
            const v = Number(first?.wind_v_10m);
            if (Number.isFinite(u) && Number.isFinite(v)) {
              const dir = Math.atan2(u, v);
              const deg = normalizeBearing(toDeg(dir));
              shipResults[resultIndex].bearing = deg;
              const shipName = shipResults[resultIndex].ship.name || shipResults[resultIndex].vesselId;
              console.log(`  Wind bearing for ${shipName}: ${deg.toFixed(1)}°`);
            }
          }
        }
      } catch (e) {
        console.log(`  Wind API error (using default bearing 0°): ${e.message}`);
      }
    }
    console.log(`\nUpdating ${shipResults.length} ships in database...`);
    let noEventsCount = 0;
    for (let idx = 0; idx < shipResults.length; idx++) {
      const result = shipResults[idx];
      const { ship, vesselId, lat, lon, bearing, noEvents } = result;
      
      let updateFields = {
        bearing: bearing,
        noEvents: noEvents
      };
      
      // Only set lat/lon if we have valid coordinates
      if (lat !== null && lon !== null) {
        updateFields.lat = lat;
        updateFields.lon = lon;
      }
      
      const updateResult = await shipsCol.updateOne(
        { _id: ship._id },
        { 
          $set: updateFields
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        if (noEvents) {
          console.log(`[${idx + 1} / ${shipResults.length}]   ✓ Updated ${ship.name || vesselId} with noEvents=true`);
          noEventsCount++;
        } else {
          console.log(`[${idx + 1} / ${shipResults.length}]   ✓ Updated ${ship.name || vesselId} with lat=${lat.toFixed(4)}, lon=${lon.toFixed(4)}, bearing=${bearing.toFixed(1)}°`);
        }
        updated++;
      } else {
        console.log(`[${idx + 1} / ${shipResults.length}]   ✗ Failed to update ${ship.name || vesselId}`);
        skipped++;
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Updated: ${updated} ships`);
    console.log(`- No events: ${noEventsCount} ships`);
    console.log(`- Skipped: ${skipped} ships`);
    console.log(`- Used wind fallback: ${singlePointCoords.length} ships`);
    console.log(`- Total processed: ${ships.length} ships`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

if (require.main === module) {
  updateVesselPositions()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateVesselPositions }; 