# Railway PostgreSQL Database Configuration Guide

## Overview
This guide explains how to configure your PostgreSQL database connection for Railway deployment with comprehensive error handling and debugging.

## Railway DATABASE_URL Format
Railway provides a `DATABASE_URL` environment variable in the following format:
```
postgresql://username:password@hostname:port/database_name
```

Example Railway DATABASE_URL:
```
postgresql://postgres:YGHoQHDPFRqdDgXMnqMFkuLCFYTqMKkD@centerbeam.proxy.rlwy.net:50948/railway
```

## Environment Variables

### Required Variables
- `DATABASE_URL` - Provided automatically by Railway
- `NODE_ENV=production` - Set by Railway

### Optional Variables (with Railway-optimized defaults)
- `DB_POOL_MAX=3` - Maximum connections in pool (reduced for Railway stability)
- `DB_POOL_MIN=0` - Minimum connections in pool (optimized for Railway)
- `DB_POOL_ACQUIRE=20000` - Connection acquisition timeout (20s)
- `DB_POOL_IDLE=5000` - Idle connection timeout (5s)
- `DB_POOL_EVICT=1000` - Connection eviction interval (1s)
- `DEBUG_DB=false` - Enable database query logging

## Railway-Specific Features

### SSL Configuration
- SSL is automatically configured for Railway PostgreSQL
- `rejectUnauthorized: false` prevents certificate errors
- SSL is required for all Railway database connections
- Enhanced SSL settings for Railway compatibility

### Connection Pooling
- Optimized for Railway's connection limits (max 3 connections)
- Automatic connection validation
- Graceful connection handling
- Railway-specific timeout settings

### Error Handling
- Comprehensive error matching for Railway-specific issues
- Automatic retry logic for connection failures
- Detailed error logging for debugging
- Railway-specific error diagnostics

## Testing Connection

### Basic Connection Test
```bash
npm run test-db
# or
node test-db-connection.js
```

### Comprehensive Debugging
```bash
npm run db:debug
# or
node debug-railway-db.js
```

### Railway-Specific Testing
```bash
npm run railway:test
# Tests with NODE_ENV=production
```

## Running Migrations

### Standard Migration
```bash
npm run migrate
# or
node migrate-database.js
```

### Railway Production Migration
```bash
npm run railway:migrate
# Runs with NODE_ENV=production
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
   - Verify Railway PostgreSQL service is running

2. **Connection Timeouts**
   - Verify Railway database is running
   - Check connection pool settings
   - Ensure proper timeout values
   - Check Railway service limits

3. **Authentication Errors**
   - Verify credentials in `DATABASE_URL`
   - Check database user permissions
   - Ensure Railway database is not sleeping

4. **Pool Exhaustion**
   - Check Railway connection limits
   - Reduce pool size if needed
   - Monitor connection usage

### Debug Mode
Enable detailed logging by setting:
```
DEBUG_DB=true
```

This will log all database queries and connection events.

### Railway-Specific Debugging

1. **Check Railway Dashboard**
   - Verify database service status
   - Check environment variables
   - Review service logs

2. **Test Connection**
   ```bash
   npm run db:debug
   ```

3. **Verify Environment**
   ```bash
   npm run railway:test
   ```

## Railway Deployment Checklist

- [ ] `DATABASE_URL` is set by Railway
- [ ] `NODE_ENV=production` is set
- [ ] SSL configuration is enabled
- [ ] Connection pooling is configured (max 3)
- [ ] Error handling is implemented
- [ ] Health monitoring is available
- [ ] Graceful shutdown is handled
- [ ] Migration scripts are tested
- [ ] Debug scripts are available

## Performance Optimization

### Railway-Specific Optimizations
- Reduced connection pool size (max 3)
- Optimized timeout settings
- Enhanced retry logic
- Connection validation
- Graceful error handling

### Monitoring
- Use Railway dashboard for database metrics
- Monitor connection pool usage
- Check response times
- Watch for timeout errors

## Support

For Railway-specific issues, check:
- Railway dashboard for database status
- Railway logs for connection errors
- Database connection metrics in Railway dashboard
- Railway documentation for PostgreSQL setup

## Quick Commands

```bash
# Test database connection
npm run test-db

# Run comprehensive debug
npm run db:debug

# Run migration
npm run migrate

# Test with production settings
npm run railway:test

# Migrate with production settings
npm run railway:migrate
```
