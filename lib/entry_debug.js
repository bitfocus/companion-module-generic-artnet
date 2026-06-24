const fs = require('fs')
const path = require('path')
const out = []
try {
    out.push('Timestamp: ' + new Date().toISOString())
    out.push('Process argv: ' + JSON.stringify(process.argv))
    out.push('Node version: ' + process.version)
    out.push('Promise.withResolvers typeof: ' + typeof Promise.withResolvers)
    out.push('Environment keys: ' + Object.keys(process.env).join(','))
    out.push('Stack at entry:')
    out.push(new Error('entry_debug stack').stack)
} catch (e) {
    try { out.push('Failed to gather diagnostics: ' + String(e)) } catch (e2) {}
}
try {
    const logPath = path.join(__dirname, '..', 'entry_debug.log')
    fs.writeFileSync(logPath, out.join('\n\n'), { encoding: 'utf8' })
} catch (e) {}
// Continue loading main
module.exports = require('./main')
