import { mockAlertService } from '@/services/mockAlertService';

export function testMockAlertSystem() {
  console.log('🧪 Testing Mock Alert System...');
  
  // Test generating alerts
  const testAlerts = mockAlertService.generateNewAlerts(5);
  console.log('✅ Generated test alerts:', testAlerts.length);
  
  // Test getting alerts
  mockAlertService.getAlerts({ hours: 24 }).then(response => {
    console.log('✅ Retrieved alerts:', response.data.length, 'total:', response.total);
  });
  
  // Test getting stats
  mockAlertService.getAlertStats(24).then(response => {
    console.log('✅ Retrieved stats:', response.data);
  });
  
  // Test high priority alerts
  mockAlertService.getHighPriorityAlerts().then(alerts => {
    console.log('✅ High priority alerts:', alerts.length);
  });
  
  console.log('🧪 Mock Alert System Test Complete!');
}

// Auto-run test when imported (for development)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    testMockAlertSystem();
  }, 2000); // Wait 2 seconds for app to load
}
