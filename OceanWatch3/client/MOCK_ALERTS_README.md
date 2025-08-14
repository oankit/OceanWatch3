# Mock Alert System for Testing

This document explains how to use the mock alert system for testing the OceanWatch Maritime Intelligence Platform's alert functionality.

## Overview

The mock alert system simulates suspicious maritime activity by generating fake alerts that mimic real AI agent behavior. This allows you to test the alert UI and functionality without needing the actual AI agent or MongoDB database running.

## Features

### 🎯 **Realistic Alert Types**
- **Loitering**: Vessels stationary in restricted areas
- **Suspicious Route**: Unusual navigation patterns
- **Speed Anomaly**: Erratic speed behavior
- **Encounter**: Vessel-to-vessel interactions
- **Port Entry/Exit**: Unauthorized port activities
- **Gap in Tracking**: Missing AIS data

### 🚨 **Severity Levels**
- **Critical**: Immediate attention required
- **High**: Significant concern
- **Medium**: Moderate risk
- **Low**: Minor anomaly

### 📍 **Geographic Distribution**
- Random global locations
- Realistic maritime coordinates
- Speed and heading data

## How It Works

### 1. **Automatic Generation**
- Initial load: 15 mock alerts generated
- Every 45-90 seconds: 30% chance of 1-3 new alerts
- Simulates real-time AI monitoring

### 2. **Manual Testing**
- Click the ⚠️ (AlertTriangle) button in the navigation
- Instantly generates 2 new test alerts
- Useful for immediate testing

### 3. **Real-time Updates**
- Alerts appear in the sidebar automatically
- Badge count updates in real-time
- Filtering and sorting work as expected

## Testing Scenarios

### **Basic Alert Display**
1. Start the application
2. Check the sidebar for initial alerts
3. Verify alert types, severities, and descriptions
4. Test alert filtering and sorting

### **Real-time Updates**
1. Wait 45-90 seconds for automatic generation
2. Watch for new alerts appearing
3. Check console logs for generation events
4. Verify badge count updates

### **Manual Testing**
1. Click the ⚠️ button in navigation
2. Verify 2 new alerts appear immediately
3. Test alert click functionality
4. Check ship selection from alerts

### **Alert Interaction**
1. Click on any alert in the sidebar
2. Verify ship selection on the map
3. Test alert expansion for details
4. Check alert filtering by severity/type

## Console Debugging

The system provides detailed console logging:

```javascript
// Initial test run
🧪 Testing Mock Alert System...
✅ Generated test alerts: 5
✅ Retrieved alerts: 15 total: 15
✅ Retrieved stats: {total: 15, by_severity: {...}, by_type: {...}}

// Real-time generation
Generated 2 new mock alerts: ['loitering - high', 'suspicious_route - critical']

// Manual generation
Manually generated mock alerts: [Alert, Alert]
```

## Configuration

### **Alert Generation Frequency**
Modify in `useAlerts.ts`:
```javascript
const shouldGenerate = Math.random() > 0.7; // 30% chance
// Change to 0.5 for 50% chance, 0.3 for 70% chance
```

### **Alert Count**
Modify in `useAlerts.ts`:
```javascript
const newAlerts = mockAlertService.generateNewAlerts(Math.floor(Math.random() * 3) + 1);
// Change 3 to adjust max alerts per generation
```

### **Initial Alert Count**
Modify in `mockAlertService.ts`:
```javascript
this.mockAlerts = generateMockAlerts(15); // Change 15 to desired count
```

## Mock Ship Data

The system uses 5 mock vessels:
- **SHIP001**: Ocean Explorer
- **SHIP002**: Maritime Star  
- **SHIP003**: Pacific Voyager
- **SHIP004**: Atlantic Trader
- **SHIP005**: Mediterranean Carrier

## Alert Descriptions

Each alert type has multiple realistic descriptions that rotate randomly:

### **Loitering Examples**
- "Vessel loitering in restricted fishing zone for 8+ hours"
- "Suspicious loitering near maritime boundary"
- "Extended loitering in high-traffic shipping lane"

### **Suspicious Route Examples**
- "Vessel deviating from normal shipping routes"
- "Unusual route pattern detected near sensitive areas"
- "Vessel taking circuitous route avoiding normal checkpoints"

## Switching to Real System

To switch back to the real alert system:

1. **In `useAlerts.ts`**:
   ```javascript
   // Change from:
   import { mockAlertService } from '@/services/mockAlertService';
   
   // To:
   import { alertService } from '@/services/alertService';
   ```

2. **Update all service calls**:
   ```javascript
   // Change from:
   mockAlertService.getRecentAlerts(hours)
   
   // To:
   alertService.getRecentAlerts(hours)
   ```

3. **Remove test imports**:
   ```javascript
   // Remove from map.tsx:
   import '@/utils/mockAlertTest';
   ```

## Troubleshooting

### **No Alerts Appearing**
- Check browser console for errors
- Verify mock service is being used
- Check network tab for failed requests

### **Alerts Not Updating**
- Verify polling interval is working
- Check console for generation logs
- Ensure `useAlerts` hook is properly connected

### **Performance Issues**
- Reduce initial alert count
- Increase generation interval
- Disable automatic generation temporarily

## Development Notes

- Mock data is generated client-side
- No network requests are made
- All timestamps are relative to current time
- Locations are randomly distributed globally
- Severity distribution is random but realistic
