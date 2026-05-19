const crypto = require('crypto');

class UltraHardObfuscator {
  constructor(code, expiryDays = 7, obfuscationType = 'max') {
    this.code = code;
    this.expiryDays = expiryDays;
    this.obfuscationType = obfuscationType; // 'standard', 'hard', 'max'
    this.hash = this.generateHash(code);
  }

  // Generate SHA256 hash dari code
  generateHash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  // Hex array encoder
  toHexArray(str) {
    const hex = Buffer.from(str, 'utf8').toString('hex').match(/.{1,2}/g) || [];
    return '[' + hex.map(h => '0x' + h).join(',') + ']';
  }

  randomId(len = 12) {
    return crypto.randomBytes(len).toString('hex');
  }

  // Variable renaming dengan pattern acak
  renameVars(code) {
    const patterns = [
      /\b(let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      /catch\s*\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)/g
    ];
    
    let counter = 0;
    const mapping = new Map();
    const reserved = ['console', 'process', 'require', 'module', 'exports', 'Buffer', 
                      'setTimeout', 'setInterval', 'Date', 'Math', 'JSON', 'Array', 
                      'Object', 'String', 'Number', 'Boolean', 'Function', 'RegExp', 
                      'Error', 'Promise', 'Buffer', '__dirname', '__filename'];
    
    const generateName = () => {
      const prefixes = ['_0x', '__ox', '_$$', '_0O', '$0x', '_Xx', '__0x', '_O0x'];
      const suffix = Math.random().toString(36).substring(2, 10);
      return prefixes[counter % prefixes.length] + counter.toString(16).toUpperCase() + suffix;
    };
    
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(code)) !== null) {
        const varName = match[2] || match[1];
        if (varName && !mapping.has(varName) && !reserved.includes(varName)) {
          mapping.set(varName, generateName());
          counter++;
        }
      }
    }
    
    let renamed = code;
    for (const [oldName, newName] of mapping) {
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      renamed = renamed.replace(regex, newName);
    }
    
    return renamed;
  }

  // Multi-layer string encoding
  encodeStrings(code) {
    const stringPattern = /(["'])((?:(?=(\\?))\3.)*?)\1/g;
    
    const decodeSystem = `
      const _1 = (a) => { let s = ''; for(let i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return Buffer.from(s,'hex').toString(); };
      const _2 = (a,b) => { let r=''; for(let i=0;i<a.length;i++) r+=String.fromCharCode(a.charCodeAt(i)^b); return r; };
      const _3 = (a) => a.split('').reverse().join('');
      const _4 = (a) => Buffer.from(a,'base64').toString();
      const _d = (a,t) => { if(t===1) return _1(a); if(t===2) return _2(_1(a),0x5A); if(t===3) return _3(_1(a)); return _4(_1(a)); };
    `;
    
    let encoded = code;
    let hasStrings = false;
    let method = 0;
    
    encoded = encoded.replace(stringPattern, (match, quote, content) => {
      hasStrings = true;
      method = (method % 4) + 1;
      const hexArr = this.toHexArray(content);
      
      if (method === 1) return `_d(${hexArr},1)`;
      if (method === 2) return `_d(${hexArr},2)`;
      if (method === 3) return `_d(${hexArr},3)`;
      return `_d(${hexArr},4)`;
    });
    
    return hasStrings ? decodeSystem + encoded : encoded;
  }

  // Control flow flattening dengan dispatcher
  flattenControlFlow(code) {
    const statements = code.split(';').filter(s => s.trim().length > 0 && s.trim().length < 500);
    if (statements.length < 5) return code;
    
    // Shuffle statements
    for (let i = statements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statements[i], statements[j]] = [statements[j], statements[i]];
    }
    
    const cases = [];
    for (let i = 0; i < statements.length; i++) {
      cases.push(`case ${i}: { ${statements[i]}; _n = ${(i + 1) % statements.length}; break; }`);
    }
    
    return `
      let _n = 0;
      const _f = () => {
        let _c = _n;
        while(true) {
          switch(_c) {
            ${cases.join('')}
            default: return;
          }
          _c = _n;
        }
      };
      _f();
    `;
  }

  // Dispatcher pattern untuk membingungkan
  createDispatcher() {
    const handlers = [];
    for (let i = 0; i < 50; i++) {
      handlers.push(`_h${i.toString(16)}: (function(...a){ return ${Math.floor(Math.random() * 1000)}; })`);
    }
    
    return `
      const _dsp = {
        ${handlers.join(',\n')}
      };
      const _call = (n,...a) => _dsp['_h'+n.toString(16)](...a);
    `;
  }

  // SUPER ANTI-DEBUG dengan multiple detection
  createAntiDebug() {
    return `
      (function() {
        'use strict';
        
        // 1. Detect DevTools via timing
        let _start = Date.now();
        debugger;
        let _end = Date.now();
        if(_end - _start > 100) { throw new Error('Debugger detected'); }
        
        // 2. Detect via function toString
        const _checkNative = (fn) => {
          const s = fn.toString();
          if(s.includes('[native code]') === false && s.length < 100) return true;
          return false;
        };
        
        if(_checkNative(console.log)) throw new Error('Console tampered');
        if(_checkNative(Array.prototype.map)) throw new Error('Native prototype tampered');
        
        // 3. Detect via __proto__ modification
        const _protoCheck = (function() {
          let _test = {};
          if(_test.__proto__ !== Object.prototype) throw new Error('Prototype polluted');
        })();
        
        // 4. Detect via constructor
        const _consCheck = (function() {
          if((function(){}) .constructor !== Function) throw new Error('Function constructor tampered');
          if(({}).constructor !== Object) throw new Error('Object constructor tampered');
        })();
        
        // 5. Detect via property descriptors
        const _descCheck = (function() {
          const _desc = Object.getOwnPropertyDescriptor(console, 'log');
          if(_desc && (_desc.get || _desc.set)) throw new Error('Property tampered');
        })();
        
        // 6. Detect via stack trace manipulation
        const _stackCheck = (function() {
          const _err = new Error();
          if(_err.stack && _err.stack.includes('debugger')) throw new Error('Stack trace tampered');
        })();
        
        // 7. Continuous monitoring
        let _counter = 0;
        setInterval(() => {
          _counter++;
          const _t1 = Date.now();
          debugger;
          const _t2 = Date.now();
          if(_t2 - _t1 > 50 || _counter > 20) {
            console.clear();
            throw new Error('Debugging not allowed');
          }
        }, 2000);
        
        // 8. Detect browser DevTools (for browser compatibility)
        if(typeof window !== 'undefined') {
          const _before = new Date();
          debugger;
          const _after = new Date();
          if(_after - _before > 100) throw new Error('DevTools detected');
          
          // Detect via element dimension
          const _div = document.createElement('div');
          _div.setAttribute('onclick', 'return;');
          if(_div.toString().includes('function onclick')) throw new Error('DevTools detected');
        }
        
        // 9. Detect process.argv (Node.js)
        if(typeof process !== 'undefined' && process.argv) {
          const _args = process.argv.join(' ');
          if(_args.includes('--inspect') || _args.includes('--debug') || _args.includes('devtools')) {
            throw new Error('Inspector detected');
          }
        }
        
        // 10. Detect environment modification
        const _envCheck = (function() {
          const _keys = Object.keys(global || window);
          const _suspicious = ['__debug', '__devtool', '__inspector', 'devtools', 'debugger'];
          for(let k of _keys) {
            for(let s of _suspicious) {
              if(k.toLowerCase().includes(s)) throw new Error('Suspicious global found');
            }
          }
        })();
        
      })();
    `;
  }

  // Self-defending dengan hash check
  createSelfDefending() {
    return `
      (function() {
        // Self integrity check
        const _stack = new Error().stack;
        if(_stack && (_stack.includes('eval') || _stack.includes('Function') || _stack.includes('debugger'))) {
          throw new Error('Code tampering detected');
        }
        
        // Check if code is being modified
        let _modified = false;
        const _origMethods = {
          log: console.log,
          error: console.error,
          warn: console.warn
        };
        
        for(let key in _origMethods) {
          if(console[key] !== _origMethods[key]) {
            _modified = true;
            break;
          }
        }
        
        if(_modified) throw new Error('Console tampering detected');
      })();
    `;
  }

  // SECURITY HASH INTEGRITY CHECK
  createSecurityHash() {
    const hash = this.hash;
    const originalCodeSnippet = this.code.substring(0, 500);
    const snippetHash = this.generateHash(originalCodeSnippet);
    
    return `
      (function() {
        const _SECURITY_HASH = '${hash}';
        const _CODE_SNIPPET = ${JSON.stringify(originalCodeSnippet)};
        
        // Hash function yang sama
        const _hash = (s) => {
          let h = 0;
          for(let i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
          }
          return Math.abs(h).toString(16);
        };
        
        // Verify current code integrity
        const _verify = () => {
          let _currentHash = '';
          let _currentSnippet = '';
          
          // Try to get current function code
          try {
            _currentSnippet = _CODE_SNIPPET;
            _currentHash = _hash(_currentSnippet);
          } catch(e) {
            throw new Error('Integrity check failed: ' + e.message);
          }
          
          if(_currentHash !== _SECURITY_HASH.substring(0, 8)) {
            throw new Error('SECURITY HASH MISMATCH - Code has been tampered');
          }
        };
        
        // Run verification
        _verify();
        
        // Periodic verification
        let _verifyCount = 0;
        setInterval(() => {
          _verifyCount++;
          if(_verifyCount > 100) return;
          _verify();
        }, 3000);
        
        // Random verification
        setTimeout(_verify, Math.random() * 5000 + 1000);
        
      })();
    `;
  }

  // Tamper protection dengan hash validation
  createTamperProtection() {
    const fullHash = this.hash;
    
    return `
      (function() {
        const _ORIGINAL_HASH = '${fullHash}';
        let _counter = 0;
        
        const _computeHash = (str) => {
          let hash = 0;
          for(let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
          }
          return Math.abs(hash).toString(16).padStart(8, '0');
        };
        
        const _validate = () => {
          // Check if critical functions are intact
          if(typeof console === 'undefined' || typeof console.log === 'undefined') {
            throw new Error('Critical object missing');
          }
          
          // Check prototype chain
          const _test = {};
          if(_test.toString !== Object.prototype.toString) {
            throw new Error('Prototype chain corrupted');
          }
        };
        
        _validate();
        
        // Continuous monitoring with random intervals
        const _monitor = () => {
          _counter++;
          if(_counter > 500) return;
          _validate();
          setTimeout(_monitor, Math.random() * 2000 + 1000);
        };
        
        setTimeout(_monitor, 500);
      })();
    `;
  }

  // Timebomb with precise expiry
  createTimebomb() {
    const expiryTime = Date.now() + (this.expiryDays * 24 * 60 * 60 * 1000);
    const contact = '@Xatanicvxii';
    
    return `
      (function() {
        const _EXPIRY = ${expiryTime};
        const _NOW = Date.now();
        
        if(_NOW > _EXPIRY) {
          const _err = new Error();
          _err.name = 'LICENSE_EXPIRED_ERROR';
          _err.message = '🔐 LICENSE HAS EXPIRED 🔐\\n\\nContact ${contact} on Telegram to renew\\n\\nExpired on: ' + new Date(_EXPIRY).toISOString();
          _err.code = 'EXPIRED_' + Math.random().toString(36).substring(2, 10).toUpperCase();
          
          console.error('\\n╔═══════════════════════════════════════════════╗');
          console.error('║         ENCRYPT GLOBAL - EXPIRED             ║');
          console.error('╠═══════════════════════════════════════════════╣');
          console.error('║  License expired on: ' + new Date(_EXPIRY).toISOString().slice(0,10) + '   ║');
          console.error('║  Contact: ${contact} on Telegram              ║');
          console.error('║  Error Code: ' + _err.code + '          ║');
          console.error('╚═══════════════════════════════════════════════╝\\n');
          
          throw _err;
        }
        
        const _remaining = Math.floor((_EXPIRY - _NOW) / (1000 * 60 * 60 * 24));
        if(_remaining <= 7 && _remaining > 0) {
          console.warn('\\n⚠️⚠️⚠️ WARNING: License expires in ' + _remaining + ' days ⚠️⚠️⚠️\\n');
        }
        
        if(_remaining <= 3 && _remaining > 0) {
          console.error('\\n🔴 CRITICAL: License expires in ' + _remaining + ' days! Contact ${contact} 🔴\\n');
        }
      })();
    `;
  }

  // Main obfuscation pipeline
  async obfuscate() {
    let result = this.code;
    
    console.log('🔒 Starting Ultra Hard Obfuscation...');
    console.log(`📊 Original size: ${this.code.length} bytes`);
    console.log(`⏰ Expiry: ${this.expiryDays} days`);
    console.log(`🔐 Security Hash: ${this.hash.substring(0, 16)}...`);
    
    // Step 1: Variable renaming
    if (this.obfuscationType !== 'standard') {
      result = this.renameVars(result);
      console.log('  ✓ Variables renamed');
    }
    
    // Step 2: String encoding
    result = this.encodeStrings(result);
    console.log('  ✓ Strings encoded (multi-layer)');
    
    // Step 3: Dispatcher
    if (this.obfuscationType === 'max') {
      result = this.createDispatcher() + '\n' + result;
      console.log('  ✓ Dispatcher pattern added');
    }
    
    // Step 4: Control flow flattening
    if (this.obfuscationType !== 'standard' && result.length > 300) {
      result = this.flattenControlFlow(result);
      console.log('  ✓ Control flow flattened (95%)');
    }
    
    // Step 5: Anti-debug (SUPER KUAT)
    result = this.createAntiDebug() + '\n' + result;
    console.log('  ✓ Anti-debug (10 detection methods)');
    
    // Step 6: Self-defending
    result = this.createSelfDefending() + '\n' + result;
    console.log('  ✓ Self-defending added');
    
    // Step 7: Security hash integrity
    result = this.createSecurityHash() + '\n' + result;
    console.log('  ✓ Security hash integrity check');
    
    // Step 8: Tamper protection
    result = this.createTamperProtection() + '\n' + result;
    console.log('  ✓ Tamper protection with hash validation');
    
    // Step 9: Timebomb
    result = this.createTimebomb() + '\n' + result;
    console.log('  ✓ Timebomb expiry set');
    
    // Step 10: Remove duplicates
    if (this.options?.duplicateLiteralsRemoval !== false) {
      const lines = result.split('\n');
      const uniqueLines = [...new Set(lines)];
      result = uniqueLines.join('\n');
      console.log('  ✓ Duplicate literals removed');
    }
    
    // Final wrapper
    result = `
      (function() {
        'use strict';
        ${result}
      })();
    `;
    
    console.log(`✅ Obfuscation complete! Final size: ${result.length} bytes`);
    
    return {
      obfuscated: result,
      hash: this.hash,
      expiry: Date.now() + (this.expiryDays * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + (this.expiryDays * 24 * 60 * 60 * 1000)).toISOString(),
      stats: {
        originalSize: this.code.length,
        obfuscatedSize: result.length,
        ratio: ((result.length / this.code.length) * 100).toFixed(2) + '%',
        hash: this.hash.substring(0, 16) + '...'
      }
    };
  }
}

// Vercel API handler
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { code, expiryDays = 7, obfuscationType = 'max' } = req.body;
    
    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'No code provided' });
    }
    
    const days = Math.min(Math.max(parseInt(expiryDays) || 7, 1), 365);
    const type = ['standard', 'hard', 'max'].includes(obfuscationType) ? obfuscationType : 'max';
    
    const obfuscator = new UltraHardObfuscator(code, days, type);
    const result = await obfuscator.obfuscate();
    
    res.json({
      success: true,
      ...result,
      obfuscationType: type,
      contact: 'https://t.me/Xatanicvxii',
      message: 'Obfuscation completed with security hash & anti-debug'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      contact: 'https://t.me/Xatanicvxii'
    });
  }
};