# Railway PostgreSQL Database Configuration Guide

## Overview
This guide explains how to configure your PostgreSQL database connection for Railway deployment.

## Railway DATABASE_URL Format
Railway provides a `DATABASE_URL` environment variable in the following format:
```
postgresql://username:password@hostname:port/database_name
```

## Environment Variables

### Required Variables
- `DATABASE_URL` - Provided automatically by Railway
- `NODE_ENV=production` - Set by Railway

### Optional Variables (with defaults)
- `DB_POOL_MAX=10` - Maximum connections in pool
- `DB_POOL_MIN=2` - Minimum connections in pool
- `DB_POOL_ACQUIRE=60000` - Connection acquisition timeout (60s)
- `DB_POOL_IDLE=10000` - Idle connection timeout (10s)
- `DB_POOL_EVICT=1000` - Connection eviction interval (1s)
- `DEBUG_DB=false` - Enable database query logging

## Railway-Specific Features

### SSL Configuration
- SSL is automatically configured for Railway PostgreSQL
- `rejectUnauthorized: false` prevents certificate errors
- SSL is required for all Railway database connections

### Connection Pooling
- Optimized for Railway's connection limits
- Automatic connection validation
- Graceful connection handling

### Error Handling
- Comprehensive error matching for Railway-specific issues
- Automatic retry logic for connection failures
- Detailed error logging for debugging

## Testing Connection

The database configuration includes a comprehensive test function:

```javascript
const { testConnection } = require('./src/config/database');

// Test the connection
testConnection()
  .then(() => console.log('Database connection successful'))
  .catch(error => console.error('Database connection failed:', error));
```

## Health Monitoring

Monitor database health with:

```javascript
const { getConnectionHealth } = require('./src/config/database');

const health = await getConnectionHealth();
console.log(health);
```

## Troubleshooting

### Common Issues

1. **SSL Connection Errors**
   - Ensure `DATABASE_URL` is properly formatted
   - Check that SSL configuration is enabled

2. **Connection Timeouts**
   - Verify Railway database is running
   - Check connection pool settings
   - Ensure proper timeout values

3. **Authentication Errors**
   - Verify credentials in `DATABASE_URL`
   - Check database user permissions

### Debug Mode
Enable detailed logging by setting:
```
DEBUG_DB=true
```

This will log all database queries and connection events.

## Railway Deployment Checklist

- [ ] `DATABASE_URL` is set by Railway
- [ ] `NODE_ENV=production` is set
- [ ] SSL configuration is enabled
- [ ] Connection pooling is configured
- [ ] Error handling is implemented
- [ ] Health monitoring is available
- [ ] Graceful shutdown is handled

## Support

For Railway-specific issues, check:
- Railway dashboard for database status
- Railway logs for connection errors
- Database connection metrics in Railway dashboard
