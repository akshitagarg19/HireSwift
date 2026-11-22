#!/usr/bin/env node
/**
 * scripts/demo-reset.mjs
 * Clears frontend localStorage state instruction and outputs instructions
 * for resetting the backend database.
 */

console.log('===========================================================')
console.log('🔄 HireSwift ATS — Demo State Reset Utility')
console.log('===========================================================')
console.log('')
console.log('1. FRONTEND STATE RESET (Browser):')
console.log('   Run in browser DevTools Console (F12 -> Console):')
console.log('   --------------------------------------------------------')
console.log('   localStorage.clear(); sessionStorage.clear(); location.reload();')
console.log('   --------------------------------------------------------')
console.log('   This resets blind mode, saved drawer states, and local UI selections.')
console.log('')
console.log('2. BACKEND DATABASE RESET:')
console.log('   [Placeholder from Akshita backend README]:')
console.log('   To restore clean 50-candidate ground-truth benchmark:')
console.log('   - If SQLite: rm -f hireswift.db && python -m backend.init_db')
console.log('   - Or FastAPI endpoint: curl -X POST http://127.0.0.1:8000/api/dev/reset')
console.log('   - Or restart the Stub Server: node frontend/tools/stub-server.mjs')
console.log('')
console.log('✓ Reset guide printed successfully.')
