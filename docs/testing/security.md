# Security Plugin Testing Guide

This guide explains how to test the security monitoring system using the built-in test endpoints.

## Quick Start

1. **Open the Security Dashboard**: Navigate to `/admin/security`
2. **Click "🧪 Test Scenarios"** to open the test dashboard
3. **Trigger test events** to see real-time security monitoring in action

## Test Dashboard Features

### Quick Test Panel (Development Mode Only)

Located directly on the Security Dashboard in development mode:

- **Inject Mixed Threats**: Simulates multiple security events including failed logins, Tor IP, and rate limiting
- **Simulate Brute Force**: Injects 5 failed login attempts to trigger brute force detection
- **Suspicious IP**: Simulates login from a VPN/suspicious IP address

### Full Test Dashboard

Navigate to `/admin/security-test` for comprehensive testing:

#### IP Intelligence Tests

- **VPN/Proxy IP**: Simulates connection from a VPN (Google DNS: 8.8.8.8)
- **Tor Exit Node**: Simulates Tor connection (185.220.101.182)
- **Datacenter IP**: Simulates AWS/Azure IP (3.93.0.0)
- **Malicious IP**: Known bad actor IP (192.168.1.100)

#### Device Analysis Tests

- **New Device**: Unknown device fingerprint
- **Bot/Crawler**: Bot user agent detection

#### Behavior Pattern Tests

- **Rapid Requests**: 50 requests in 1 second (rate limiting)
- **Failed Logins**: 5 failed login attempts (brute force)
- **Bot Mouse**: Linear mouse movement (bot-like)

#### Session & Location Tests

- **Suspicious Country**: Login from high-risk country
- **Impossible Travel**: 5000km in 1 minute
- **Many Sessions**: 10 concurrent sessions
- **Long Session**: 24+ hour active session

## API Testing

### Inject Custom Events

```bash
curl -X POST http://localhost:5173/api/test/security/inject \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "events": [
      {
        "type": "auth_failure",
        "success": false,
        "factors": ["invalid_password"],
        "ip": "192.168.1.100"
      }
    ]
  }'
```

### Get Preset Events

```bash
curl http://localhost:5173/api/test/security/inject
```

Returns predefined event sets:

- `brute_force`: 5 failed login attempts
- `suspicious_ip`: VPN connection with suspicious factors
- `bot_behavior`: Bot user agent with no mouse movement
- `mixed_threats`: Combination of multiple threat types

## Testing Scenarios

### 1. Testing Rate Limiting

1. Open Security Dashboard
2. Click "Inject Mixed Threats" multiple times quickly
3. Watch the Rate Limiting panel for blocked requests
4. Check the Threat Feed for rate limit events

### 2. Testing IP Intelligence

1. Click "Suspicious IP" or "Tor Exit Node"
2. Observe the IP Intelligence panel update
3. Check for new entries in blocked IPs list
4. Review the threat feed for IP-based alerts

### 3. Testing Brute Force Detection

1. Click "Simulate Brute Force"
2. Watch Authentication Metrics for failed login count
3. Check if CAPTCHA is triggered
4. Review user risk profiles for elevated scores

### 4. Testing Device Fingerprinting

1. Click "New Device" test
2. Check device analytics for new device count
3. Review security signals for device-based alerts

## Real-time Monitoring

All test events are injected in real-time and will:

- Appear in the Threat Feed immediately
- Update all relevant dashboard panels
- Trigger appropriate security responses (CAPTCHA, blocking, etc.)
- Be stored in analytics for historical analysis

## Development Tips

1. **Use "Reset Dashboard Data"** between test scenarios to start fresh
2. **Check browser console** for detailed event logs
3. **Monitor Redis** if using Redis storage for real-time event processing
4. **Review server logs** for detailed security event information

## Production Considerations

- Test endpoints are only available in development mode
- All injected events are marked with `test: true` in metadata
- Test events can be filtered out in production analytics
- Consider removing test endpoints before production deployment

## Troubleshooting

### Events not appearing?

- Check if the security plugin is enabled
- Verify Redis connection if using Redis storage
- Check browser console for JavaScript errors
- Review server logs for injection errors

### High risk scores not triggering?

- Check security thresholds in config
- Verify risk factors are being applied correctly
- Review risk calculation logic in the SDK

### Rate limiting not working?

- Check rate limit configuration
- Verify request counting logic
- Review time window calculations

## Example Test Workflow

```bash
# 1. Clear existing data
curl -X POST http://localhost:5173/admin/security?/clearCache

# 2. Inject brute force attempts
curl -X POST http://localhost:5173/api/test/security/inject \
  -H "Content-Type: application/json" \
  -d '{"events": [{"type": "auth_failure", "success": false, "factors": ["invalid_password"]}]}' \
  -X POST -d '{"events": [{"type": "auth_failure", "success": false, "factors": ["invalid_password"]}]}' \
  -X POST -d '{"events": [{"type": "auth_failure", "success": false, "factors": ["invalid_password"]}]}' \
  -X POST -d '{"events": [{"type": "auth_failure", "success": false, "factors": ["invalid_password"]}]}' \
  -X POST -d '{"events": [{"type": "auth_failure", "success": false, "factors": ["invalid_password"]}]}'

# 3. Check dashboard for alerts
# Navigate to /admin/security to see results
```
