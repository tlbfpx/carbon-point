#!/usr/bin/env node
/**
 * Build script: Extract page CONTENT (no shell) from each designer file,
 * inject into a unified shell. No iframes, no double nav.
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function read(f) { return fs.readFileSync(path.join(DIR, f), 'utf-8'); }
function write(f, data) { fs.writeFileSync(path.join(DIR, f), data, 'utf-8'); }

// Extract HTML between open tag of id=X and its matching close </div>,
// but STOP when hitting another div with class="page or class="page-container
function extractContent(html, id) {
  // Find the opening tag
  const openRe = new RegExp(`<div[^>]*\\sid=["']${id}["'][^>]*>`, 'i');
  const open = html.match(openRe);
  if (!open) return `<!-- ${id} not found -->`;

  const start = open.index + open[0].length;
  let depth = 1, pos = start;
  const substr = html.substring(start);

  // Find the matching closing div - stop at top-level siblings
  for (let i = 0; i < substr.length && depth > 0; i++) {
    if (substr.substring(i, i + 5) === '<div ') {
      // Check if it's a top-level page container (starts with no indentation or specific patterns)
      // Simple approach: if we see <div class="page or <div class="page-container
      // AND we're at depth 1, treat it as sibling end
      const ahead = substr.substring(i + 5);
      const clsMatch = ahead.match(/^(?:class|id)=/);
      if (depth === 1 && clsMatch) {
        // Check for page/page-container
        const rest = ahead.replace(clsMatch[0], '');
        if (/^["']?(?:page|page-container)/.test(rest)) {
          return substr.substring(0, i);
        }
      }
      depth++;
      i += 4; // skip past '<div '
    } else if (substr.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) return substr.substring(0, i);
      i += 5;
    }
  }
  return substr.substring(0, 500); // fallback
}

// Extract all page content from a single file that has multiple page divs
// Returns {id: content} map
function extractAllPages(html) {
  const pages = {};
  // Match all <div class="page... (with optional id)
  const pageRe = /<div[^>]*\sclass=["']([^"']*page[^"']*)["'][^>]*>/gi;
  let m;
  while ((m = pageRe.exec(html)) !== null) {
    const openTag = m[0];
    const classes = m[1];
    // Extract id if present
    const idMatch = openTag.match(/\sid=["']([^"']+)["']/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (pages[id]) continue; // already extracted
    const start = m.index + openTag.length;
    let depth = 1, pos = start;
    const substr = html.substring(start);
    for (let i = 0; i < substr.length && depth > 0; i++) {
      if (substr.substring(i, i + 5) === '<div ') {
        depth++;
        i += 4;
      } else if (substr.substring(i, i + 6) === '</div>') {
        depth--;
        if (depth === 0) {
          pages[id] = substr.substring(0, i);
          break;
        }
        i += 5;
      }
    }
  }
  return pages;
}

// Extract body content between body tag
function body(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : '';
}

// Extract inner content between start and end patterns
function between(html, startPat, endPat) {
  if (typeof startPat === 'string') startPat = new RegExp(startPat);
  const sm = html.match(startPat);
  if (!sm) return '';
  const idx = sm.index + sm[0].length;
  const em = html.substring(idx).match(endPat);
  if (!em) return html.substring(idx);
  return html.substring(idx, idx + em.index);
}

console.log('Reading files...');
const F = {};
['designer-1-enterprise-core.html','designer-2-enterprise-operations.html',
 'designer-3-platform-admin.html','designer-5-login-auth.html',
 'designer-6-employee-deep.html','designer-7-department-team.html',
 'designer-8-rbac-deep.html','designer-9-rule-engine-visual.html',
 'designer-10-product-deep.html','designer-11-order-deep.html',
 'designer-12-h5-login-home-checkin.html','designer-13-h5-points-mall-coupons.html',
 'designer-14-h5-profile-badges-msg.html','designer-15-platform-admin-full.html'
].forEach(f => F[f] = read(f));

console.log('Extracting pages...');

// ---- Enterprise: dashboard pages from designer-1 ----
const ent1 = extractAllPages(F['designer-1-enterprise-core.html']);
console.log('designer-1 pages:', Object.keys(ent1));

// ---- Enterprise: operation pages from designer-2 ----
const ent2 = extractAllPages(F['designer-2-enterprise-operations.html']);
console.log('designer-2 pages:', Object.keys(ent2));

// ---- Employee deep from designer-6 ----
const empPages = extractAllPages(F['designer-6-employee-deep.html']);
console.log('designer-6 pages:', Object.keys(empPages));

// ---- Dept from designer-7 ----
const deptPages = extractAllPages(F['designer-7-department-team.html']);
console.log('designer-7 pages:', Object.keys(deptPages));

// ---- RBAC from designer-8 ----
const rbacPages = extractAllPages(F['designer-8-rbac-deep.html']);
console.log('designer-8 pages:', Object.keys(rbacPages));

// ---- Rule engine from designer-9 ----
const ruleContent = between(F['designer-9-rule-engine-visual.html'], '<main class="main-content">', '</main>');

// ---- Product from designer-10 ----
const productContent = between(F['designer-10-product-deep.html'], /<div class="content"[^>]*id="mainContent">/, /<script/);

// ---- Order from designer-11 ----
const orderContent = between(F['designer-11-order-deep.html'], /<div class="content">/, /<\/div>\s*<\/div>\s*<script/);

// ---- Platform admin from designer-15 ----
const pltPages = extractAllPages(F['designer-15-platform-admin-full.html']);
console.log('designer-15 pages:', Object.keys(pltPages));

// ---- H5 mobile pages ----
const h5Body12 = body(F['designer-12-h5-login-home-checkin.html']);
const h5Body13 = body(F['designer-13-h5-points-mall-coupons.html']);
const h5Body14 = body(F['designer-14-h5-profile-badges-msg.html']);

// ---- Login from designer-5 ----
const loginEnt = between(F['designer-5-login-auth.html'], /id="page-enterprise"[^>]*>/, /<div id="page-platform"/);
const loginPlat = between(F['designer-5-login-auth.html'], /id="page-platform"[^>]*>/, /<div id="page-forgot"/);

// ---- Extract CSS and JS from source files ----
function css(html) {
  const ms = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  return ms ? ms.join('\n') : '';
}
function js(html) {
  const ms = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  return ms ? ms.map(s => s.replace(/<\/?script[^>]*>/gi, '')).join('\n') : '';
}

// Deduplicate top-level var declarations across scripts to avoid conflicts
// Handles multi-line array/object literals correctly
function deduplicateJS(allJS) {
  const seen = new Set();
  let i = 0;
  const result = [];
  while (i < allJS.length) {
    // Check for const/let/var at position i (skip leading whitespace/newlines)
    let ws = '';
    let pos = i;
    while (pos < allJS.length && /\s/.test(allJS[pos]) && allJS[pos] !== '\n') pos++;
    if (allJS[pos] === '\n') { ws += allJS[i]; i++; continue; }
    const kw = allJS.substring(pos, pos + 5);
    if (kw === 'const' || kw === 'let  ' || kw === 'var  ') {
      const actualKw = kw === 'const' ? 'const' : kw === 'let  ' ? 'let' : 'var';
      pos += kw.length;
      while (pos < allJS.length && /\s/.test(allJS[pos])) pos++;
      // Read var name
      const nameStart = pos;
      while (pos < allJS.length && /\w/.test(allJS[pos])) pos++;
      const name = allJS.substring(nameStart, pos);
      if (name && !/^\d/.test(name)) {
        if (seen.has(name)) {
          // Skip this declaration (multi-line aware: find the closing semicolon at depth 0)
          let depth = 0;
          while (pos < allJS.length) {
            const c = allJS[pos];
            if (c === '[' || c === '{' || c === '(') depth++;
            else if (c === ']' || c === '}' || c === ')') depth--;
            else if (c === ';' && depth === 0) { pos++; break; }
            else if (c === '\n' && depth === 0) {
              // Check if next non-whitespace is on same logical statement
              let look = pos + 1;
              while (look < allJS.length && /\s/.test(allJS[look]) && allJS[look] !== '\n') look++;
              if (allJS[look] === '\n' || allJS[look] === '/' || look >= allJS.length) break;
            }
            pos++;
          }
          i = pos;
          continue;
        } else {
          seen.add(name);
        }
      }
    }
    result.push(allJS[i]);
    i++;
  }
  return result.join('');
}

console.log('Building unified HTML...');

// ==================== BUILD ====================
const OUT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>碳积分打卡平台 - SaaS 管理后台</title>
<style>
/* ============================
   UNIFIED CSS FRAMEWORK
   ============================ */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;font-size:14px;color:#333;line-height:1.5}
body{background:#f5f5f5;min-height:100vh}
a{color:inherit;text-decoration:none}

/* ===== APP SHELLS ===== */
#login-shell{display:flex;min-height:100vh}
.app-shell{display:none;height:100vh;overflow:hidden}
.app-shell.active{display:flex}

/* ===== LOGIN PAGE ===== */
.login-bar{position:fixed;top:0;left:0;right:0;z-index:1000;background:#fff;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:center;height:52px;gap:8px;padding:0 16px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.login-brand{position:absolute;left:20px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;color:#52c41a}
.dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#52c41a,#73d13d);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.8)}}
.nav-tab{padding:6px 16px;border-radius:6px;font-size:13px;color:#666;cursor:pointer;font-weight:500;transition:all .2s}
.nav-tab:hover{background:rgba(0,0,0,.04)}
.nav-tab.active{color:#fff;background:linear-gradient(135deg,#52c41a,#73d13d)}
.nav-tab.blue.active{background:linear-gradient(135deg,#1677ff,#4096ff)}
.login-bg{position:fixed;top:52px;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center}
.bg-green{background:linear-gradient(135deg,#f0f9eb,#e8f5e0,#d9f2c6)}
.bg-blue{background:linear-gradient(135deg,#e6f4ff,#d6e4ff,#adc6ff)}
.login-card{width:100%;max-width:420px;background:rgba(255,255,255,.95);backdrop-filter:blur(20px);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.1);padding:40px;margin:16px}
.card-logo{width:56px;height:56px;border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px}
.cl-green{background:linear-gradient(135deg,#52c41a,#73d13d);box-shadow:0 4px 16px rgba(82,196,26,.3)}
.cl-blue{background:linear-gradient(135deg,#1677ff,#4096ff);box-shadow:0 4px 16px rgba(22,119,255,.3)}
.card-title{text-align:center;font-size:22px;font-weight:700;margin-bottom:4px}
.card-sub{text-align:center;font-size:13px;color:#999;margin-bottom:32px}
.form-group{margin-bottom:20px}
.form-label{display:block;font-size:14px;font-weight:500;margin-bottom:6px}
.input-wrap{display:flex;align-items:center;border:1px solid #ddd;border-radius:8px;background:#fff;transition:border-color .2s}
.input-wrap:hover{border-color:#4096ff}
.input-icon{width:40px;display:flex;align-items:center;justify-content:center;color:#999;font-size:16px}
.input{flex:1;border:none;outline:none;padding:10px 12px;font-size:14px;height:42px;background:transparent}
.input::placeholder{color:#bbb}
.eye{width:40px;display:flex;align-items:center;justify-content:center;color:#999;cursor:pointer;font-size:16px}
.captcha-row{display:flex;gap:10px}
.captcha-box{width:120px;height:42px;border-radius:8px;border:1px solid #ddd;cursor:pointer;position:relative;overflow:hidden;background:#fff;flex-shrink:0}
.captcha-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:2px;font-size:22px;font-weight:700;font-style:italic;user-select:none}
.captcha-char:nth-child(1){color:#389e0d;transform:rotate(-8deg)}
.captcha-char:nth-child(2){color:#cf1322;transform:rotate(6deg)}
.captcha-char:nth-child(3){color:#0958d9;transform:rotate(-4deg)}
.captcha-char:nth-child(4){color:#d46b08;transform:rotate(10deg)}
.captcha-noise{position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.03) 3px,rgba(0,0,0,.03) 4px)}
.captcha-line{position:absolute;width:80%;height:2px;background:rgba(0,0,0,.08);top:50%;left:10%;transform:rotate(-5deg)}
.captcha-ref{position:absolute;bottom:2px;right:4px;font-size:10px;color:rgba(0,0,0,.3)}
.check-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.checkbox{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:#666;user-select:none}
.checkbox .box{width:16px;height:16px;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;transition:all .2s;background:#fff}
.checkbox.checked .box{background:#52c41a;border-color:#52c41a;color:#fff}
.check-link{color:#52c41a;font-weight:500;font-size:13px}
.btn-login{width:100%;height:46px;border-radius:10px;border:none;cursor:pointer;font-size:16px;font-weight:600;color:#fff;transition:all .3s}
.btn-green{background:linear-gradient(135deg,#52c41a,#73d13d);box-shadow:0 4px 12px rgba(82,196,26,.3)}
.btn-green:hover{background:linear-gradient(135deg,#73d13d,#95de64)}
.btn-blue{background:linear-gradient(135deg,#1677ff,#4096ff);box-shadow:0 4px 12px rgba(22,119,255,.3)}
.btn-blue:hover{background:linear-gradient(135deg,#4096ff,#69b1ff)}
.login-footer{text-align:center;margin-top:20px;font-size:12px;color:#ccc}
.login-footer a{color:#52c41a}
.sec-tip{display:flex;align-items:flex-start;gap:10px;padding:12px;background:#e6f4ff;border:1px solid #91caff;border-radius:8px;margin-bottom:20px;font-size:13px;color:#0958d9}
.sec-tip .icon{flex-shrink:0;margin-top:1px}
.leaf{position:absolute;pointer-events:none;opacity:.12;font-size:28px;animation:float linear infinite}
@keyframes float{0%{transform:translateY(0) rotate(0deg)}100%{transform:translateY(-100vh) rotate(360deg)}}

/* ===== ADMIN SHELL ===== */
.admin-shell{display:flex;height:100vh;overflow:hidden}

/* Sidebar */
.u-sidebar{width:220px;background:#001529;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden}
.u-sidebar-logo{height:56px;display:flex;align-items:center;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}
.u-sidebar-logo .ico{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;margin-right:10px;flex-shrink:0;background:linear-gradient(135deg,#1677ff,#69b1ff)}
.u-sidebar-logo .ico.purple{background:linear-gradient(135deg,#722ed1,#b37feb)}
.u-sidebar-logo .logo-text{color:#fff;font-size:15px;font-weight:600}
.u-sidebar-scroll{flex:1;overflow-y:auto;padding:8px 0}
.menu-section{padding:12px 20px 4px;font-size:11px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}
.menu-item{display:flex;align-items:center;padding:0 20px;height:40px;color:rgba(255,255,255,.65);cursor:pointer;font-size:14px;transition:all .15s;border-radius:0;margin:0 8px;border-radius:6px}
.menu-item:hover{color:#fff;background:rgba(255,255,255,.06)}
.menu-item.active{color:#fff;background:#1677ff}
.menu-item .mi{margin-right:10px;font-size:16px}
.menu-item .ml{flex:1}
.menu-badge{background:#ff4d4f;color:#fff;font-size:10px;padding:0 6px;border-radius:10px;margin-left:auto;line-height:16px}
.u-sidebar-footer{flex-shrink:0;padding:12px 20px;border-top:1px solid rgba(255,255,255,.1)}

/* Header */
.top-header{height:56px;background:#fff;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;padding:0 24px;flex-shrink:0}
.top-header .breadcrumb{color:#666;font-size:14px}
.top-header .breadcrumb span{margin:0 4px;color:#999}
.top-header .cur{color:#222;font-weight:500}
.top-header .right{display:flex;align-items:center;gap:12px}
.top-header .icon-btn{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666;cursor:pointer;font-size:18px;transition:background .2s}
.top-header .icon-btn:hover{background:#f5f5f5}
.top-header .user{display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 8px;border-radius:8px;transition:background .2s}
.top-header .user:hover{background:#f5f5f5}
.avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1677ff,#69b1ff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
.avatar.purple{background:linear-gradient(135deg,#722ed1,#b37feb)}
.user-name{font-size:14px;color:#333}
.user-role{font-size:11px;color:#999;background:#f5f5f5;padding:1px 6px;border-radius:4px;margin-left:4px}

/* Main content */
.main{flex:1;overflow:hidden;display:flex;flex-direction:column}
.content-area{flex:1;overflow-y:auto;padding:20px 24px}

/* Pages */
.page-content{display:none}
.page-content.active{display:block}

/* Common */
.card{background:#fff;border-radius:8px;padding:20px 24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.card-title{font-size:16px;font-weight:600;color:#333;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
.card-title .sub{font-size:13px;color:#999;font-weight:400}
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px}
.kpi-card{background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.kpi-card .label{font-size:14px;color:#888;margin-bottom:8px}
.kpi-card .value{font-size:32px;font-weight:700;color:#333}
.kpi-card .suffix{font-size:14px;font-weight:400;color:#999;margin-left:4px}
.kpi-card .trend{margin-top:8px;font-size:13px}
.kpi-card .trend.up{color:#52c41a}
.kpi-card .trend.down{color:#ff4d4f}
.chart-card{background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:24px}
.chart-card h3{font-size:16px;margin-bottom:20px;font-weight:600}
.bar-chart{display:flex;align-items:flex-end;gap:12px;height:200px;padding-top:10px;border-bottom:2px solid #f0f0f0}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}
.bar{width:100%;max-width:48px;background:linear-gradient(180deg,#1677ff,#69b1ff);border-radius:4px 4px 0 0;transition:height .5s}
.bar-label{font-size:12px;color:#999;margin-top:4px}
.bar-value{font-size:11px;color:#1677ff;font-weight:600}
.chart-legend{display:flex;gap:20px;margin-top:16px;font-size:13px;color:#888}
.chart-legend i{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;background:#1677ff}
.stat-grid{display:grid;gap:16px;margin-bottom:20px}
.stat-3{grid-template-columns:repeat(3,1fr)}
.stat-4{grid-template-columns:repeat(4,1fr)}
.stat-5{grid-template-columns:repeat(5,1fr)}
.stat-card{background:#fff;border-radius:8px;padding:20px;border:1px solid #f0f0f0;position:relative;overflow:hidden}
.stat-label{font-size:13px;color:#999;margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;color:#333}
.stat-change{margin-top:8px;font-size:12px}
.stat-change.up{color:#52c41a}
.stat-change.down{color:#ff4d4f}
.stat-icon{position:absolute;top:16px;right:16px;width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px}
.stat-icon.blue{background:#e6f4ff;color:#1677ff}
.stat-icon.green{background:#f6ffed;color:#52c41a}
.stat-icon.orange{background:#fff7e6;color:#fa8c16}
.stat-icon.purple{background:#f9f0ff;color:#722ed1}
.stat-icon.cyan{background:#e6fffb;color:#13c2c2}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:5px 16px;border-radius:6px;font-size:14px;height:34px;line-height:1.4;font-weight:400;transition:all .2s;white-space:nowrap;border:1px solid transparent}
.btn-primary{background:#1677ff;color:#fff;border-color:#1677ff}
.btn-primary:hover{background:#4096ff}
.btn-default{background:#fff;color:#333;border-color:#d9d9d9}
.btn-default:hover{color:#1677ff;border-color:#1677ff}
.btn-danger{background:#ff4d4f;color:#fff;border-color:#ff4d4f}
.btn-danger:hover{background:#ff7875}
.btn-link{color:#1677ff;padding:0;height:auto;border:none;background:none}
.btn-link:hover{color:#4096ff}
.btn-sm{height:28px;padding:2px 10px;font-size:13px;border-radius:4px}
.tag{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:500}
.tag-green{background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}
.tag-red{background:#fff2f0;color:#ff4d4f;border:1px solid #ffccc7}
.tag-orange{background:#fff7e6;color:#fa8c16;border:1px solid #ffd591}
.tag-blue{background:#e6f7ff;color:#1677ff;border:1px solid #91caff}
.tag-purple{background:#f9f0ff;color:#722ed1;border:1px solid #d3adf7}
.tag-gold{background:#fffbe6;color:#d48806;border:1px solid #ffe58f}
.tag-cyan{background:#e6fffb;color:#13c2c2;border:1px solid #87e8de}
table{width:100%;border-collapse:collapse}
th{background:#fafafa;font-weight:600;text-align:left;padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;white-space:nowrap}
td{padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px}
tr:hover td{background:#fafafa}
input[type="text"],input[type="tel"],input[type="password"],input[type="number"],input[type="date"],select,textarea{height:36px;border:1px solid #d9d9d9;border-radius:6px;padding:0 12px;font-size:14px;outline:none;transition:border-color .2s;background:#fff}
input:focus,select:focus,textarea:focus{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.1)}
textarea{height:auto;padding:10px 12px;resize:vertical}
.pagination{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:16px;font-size:13px;color:#666}
.page-btn{width:32px;height:32px;border:1px solid #d9d9d9;border-radius:6px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .2s}
.page-btn:hover,.page-btn.active{border-color:#1677ff;color:#1677ff}
.page-btn.active{background:#1677ff;color:#fff}
.toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.toolbar-left{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.search-wrap{display:flex;align-items:center;border:1px solid #d9d9d9;border-radius:6px;padding:0 12px;height:36px;background:#fff;min-width:200px}
.search-wrap input{border:none;outline:none;flex:1;background:transparent;font-size:14px}

/* Tabs */
.tabs{display:flex;border-bottom:1px solid #f0f0f0;margin-bottom:20px}
.tab{padding:10px 20px;font-size:14px;color:#666;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.tab:hover{color:#1677ff}
.tab.active{color:#1677ff;border-bottom-color:#1677ff;font-weight:500}
.tab-content{display:none}
.tab-content.active{display:block}

/* H5 Modal */
.h5-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.h5-modal.active{display:flex}
.h5-frame{width:440px;height:calc(100vh - 40px);max-height:880px;background:#1a1a1a;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.h5-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#2a2a2a;color:#fff;font-size:14px;font-weight:500}
.h5-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s}
.h5-close:hover{background:rgba(255,255,255,.2)}
.h5-tabs{display:flex;gap:6px;padding:8px 12px;background:#2a2a2a;border-bottom:1px solid rgba(255,255,255,.1)}
.h5-tab{padding:4px 12px;border-radius:4px;font-size:12px;color:rgba(255,255,255,.5);cursor:pointer;transition:all .2s}
.h5-tab:hover{color:rgba(255,255,255,.8)}
.h5-tab.active{background:#52c41a;color:#fff}
.h5-screen{width:375px;height:calc(100% - 100px);margin:0 auto;overflow:hidden;position:relative;background:#f5f5f5;border-radius:0}
.h5-page{position:absolute;inset:0;display:none;overflow-y:auto}
.h5-page.active{display:block}
.h5-page iframe{width:375px;height:100%;border:none}

/* Employee list specific */
.emp-row{display:flex;align-items:center;gap:12px}
.emp-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1677ff,#69b1ff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
.emp-avatar.green{background:linear-gradient(135deg,#52c41a,#73d13d)}
.emp-avatar.orange{background:linear-gradient(135deg,#fa8c16,#ffa940)}
.emp-avatar.purple{background:linear-gradient(135deg:#722ed1,#b37feb)}
.emp-avatar.cyan{background:linear-gradient(135deg:#13c2c2,#36cfc9)}

/* ===== PAGE-SPECIFIC STYLES (scoped) ===== */

/* Rule engine */
.flow-banner{background:linear-gradient(135deg,#f0f5ff,#e6f4ff);border:1px solid #adc6ff;border-radius:12px;padding:20px 24px;margin-bottom:20px}
.flow-title{font-size:16px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.flow-badge{background:#1677ff;color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:400;margin-left:auto}
.flow-chain{display:flex;align-items:center;justify-content:center;flex-wrap:wrap}
.flow-step{cursor:pointer;text-align:center;position:relative}
.flow-box{background:#fff;border:2px solid #ddd;border-radius:10px;padding:10px 14px;min-width:80px;transition:all .2s;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.flow-step.active .flow-box{border-color:#1677ff;background:#e6f4ff;box-shadow:0 4px 12px rgba(22,119,255,.2)}
.flow-num{font-size:12px;font-weight:700;color:#1677ff;margin-bottom:2px}
.flow-icon{font-size:20px;margin:2px 0}
.flow-label{font-size:11px;color:#666}
.flow-arrow{width:24px;height:2px;background:#ddd;position:relative;margin:0 4px}
.flow-arrow::after{content:'';position:absolute;right:-2px;top:-3px;border:4px solid transparent;border-left-color:#ddd}
.flow-desc{font-size:12px;color:#999;text-align:center;margin-top:12px}
.info-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:#f0f5ff;border-left:3px solid #1677ff;border-radius:0 6px 6px 0;margin-bottom:16px;font-size:13px;color:#1677ff}
.info-alert .icon{flex-shrink:0;margin-top:1px}
.level-cards{display:flex;gap:16px;flex-wrap:wrap}
.level-card{border-radius:12px;padding:20px;min-width:140px;cursor:pointer;transition:all .2s;text-align:center;border:2px solid transparent}
.level-card:hover{border-color:#1677ff;transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}
.level-card.current{border-color:#1677ff;box-shadow:0 4px 16px rgba(22,119,255,.15)}
.level-card.bronze{background:linear-gradient(135deg,#fff7e6,#ffe7ba);border-color:#ffd591}
.level-card.silver{background:linear-gradient(135deg,#f5f5f5,#e8e8e8);border-color:#d9d9d9}
.level-card.gold{background:linear-gradient(135deg,#fffbe6,#fff1b8);border-color:#ffe58f}
.level-card.platinum{background:linear-gradient(135deg,#f0f5ff,#d6e4ff);border-color:#91caff}
.level-card.diamond{background:linear-gradient(135deg,#f9f0ff,#d3adf7);border-color:#b37feb}
.lc-icon{font-size:28px;font-weight:800;margin-bottom:4px}
.lc-name{font-size:14px;font-weight:600;margin-bottom:2px}
.lc-range{font-size:11px;color:rgba(0,0,0,.45);margin-bottom:6px}
.lc-coeff{font-size:20px;font-weight:700;color:#1677ff;margin-bottom:4px}
.lc-desc{font-size:11px;color:rgba(0,0,0,.45)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-head{text-align:center;font-size:12px;color:#999;font-weight:500;padding:4px}
.cal-cell{text-align:center;padding:8px;border-radius:6px;font-size:13px;cursor:pointer;transition:all .2s}
.cal-cell:hover{background:#f0f0f0}
.cal-cell.empty{background:transparent}
.cal-cell.has-event{background:#e6f4ff;color:#1677ff;font-weight:600}
.cal-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#1677ff;color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center}
.date-list{display:flex;flex-direction:column;gap:8px}
.date-item{display:flex;align-items:center;gap:12px;padding:12px;background:#fafafa;border-radius:8px;cursor:pointer;transition:all .2s}
.date-item:hover{background:#f0f0f0}
.date-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.date-dot.x2{background:#1677ff}
.date-dot.x3{background:#fa8c16}
.date-dot.x5{background:#ff4d4f}
.date-info{flex:1}
.date-name{font-size:14px;font-weight:500}
.date-desc{font-size:12px;color:rgba(0,0,0,.45);margin-top:2px}
.date-mult{font-size:16px;font-weight:700;flex-shrink:0}
.date-mult.x2{color:#1677ff}
.date-mult.x3{color:#fa8c16}
.date-mult.x5{color:#ff4d4f}
.date-rec{font-size:10px;color:#52c41a;background:#f6ffed;padding:1px 6px;border-radius:4px;border:1px solid #b7eb8f}
.gauge-wrap{display:flex;gap:32px;align-items:center;padding:16px 0}
.gauge{position:relative;width:180px;height:180px;flex-shrink:0}
.gauge-bg{position:absolute;inset:0;border-radius:50%;background:#f0f0f0}
.gauge-fill{position:absolute;inset:0;border-radius:50%;background:conic-gradient(#1677ff 0deg,#1677ff 135deg,transparent 135deg);transform:rotate(-135deg)}
.gauge-center{position:absolute;inset:16px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}
.gauge-val{font-size:36px;font-weight:700;color:#1677ff}
.gauge-unit{font-size:13px;color:#999}
.slider-track{width:100%;height:6px;background:#f0f0f0;border-radius:3px;position:relative;cursor:pointer}
.slider-fill{height:100%;background:#1677ff;border-radius:3px}
.slider-thumb{width:16px;height:16px;background:#1677ff;border-radius:50%;position:absolute;top:50%;transform:translateY(-50%);box-shadow:0 2px 6px rgba(22,119,255,.3)}
.config-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.config-item{padding:12px;background:#fafafa;border-radius:8px}
.config-label{font-size:13px;font-weight:500}
.config-desc{font-size:12px;color:#999;margin-top:2px}
.switch{display:flex;align-items:center;justify-content:space-between;padding:8px 0;cursor:pointer}
.switch-track{width:40px;height:22px;background:#d9d9d9;border-radius:11px;position:relative;transition:background .2s;flex-shrink:0}
.switch-track.on{background:#52c41a}
.switch-thumb{width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.switch-track.on .switch-thumb{left:20px}
.sec-card{background:#fff;border-radius:8px;border:1px solid #f0f0f0;margin-bottom:16px;overflow:hidden}
.sec-card-head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #f0f0f0}
.sec-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.sec-title{font-size:15px;font-weight:600}
.sec-desc{font-size:13px;color:#999;margin-top:2px}
.sec-body{padding:20px}
.num-input{display:flex;align-items:center}
.num-btn{width:32px;height:36px;background:#f0f0f0;border:1px solid #d9d9d9;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;font-weight:600;transition:background .2s;flex-shrink:0}
.num-btn:hover{background:#e8e8e8}
.num-input input{width:60px;height:36px;border:1px solid #d9d9d9;border-left:none;border-right:none;text-align:center;font-size:14px;outline:none}

/* Dept tree */
.dept-tree{font-size:14px}
.tree-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background .2s}
.tree-row:hover{background:#f5f5f5}
.tree-toggle{font-size:14px;color:#1677ff;cursor:pointer;width:20px;text-align:center;flex-shrink:0}
.tree-name{font-weight:500}
.tree-meta{font-size:12px;color:#999;margin-left:8px}

/* RBAC */
.role-preview{background:#001529;border-radius:8px;padding:16px;min-width:200px}
.role-preview-title{font-size:13px;color:rgba(255,255,255,.65);margin-bottom:12px;text-align:center}
.preview-item{display:flex;align-items:center;padding:6px 12px;color:rgba(255,255,255,.65);font-size:13px;gap:8px;margin-bottom:4px}
.preview-item.on{color:#fff}
.preview-item.off{color:rgba(255,255,255,.25);text-decoration:line-through}
.pm-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.preview-item.on .pm-dot{background:#52c41a}
.preview-item.off .pm-dot{background:rgba(255,255,255,.15)}

/* Order stats */
.stat-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:20px}
.stat-card{cursor:pointer;transition:all .2s}
.sc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.sc-title{font-size:13px;color:#666}
.sc-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.sc-val{font-size:28px;font-weight:700}
.sc-foot{font-size:12px;color:#999;margin-top:4px}
.tabs-bar{display:flex;border-bottom:1px solid #f0f0f0;margin-bottom:16px}
.tab-count{background:#f5f5f5;font-size:11px;padding:0 6px;border-radius:10px;margin-left:4px}

/* Points */
.pts-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
.pts-card{background:#fff;border-radius:8px;padding:20px;border:1px solid #f0f0f0;text-align:center}
.pts-val{font-size:28px;font-weight:700;color:#fa8c16;margin-bottom:4px}
.pts-label{font-size:13px;color:#999}

/* Product grid */
.prod-toolbar{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.view-toggle{display:flex;border:1px solid #d9d9d9;border-radius:6px;overflow:hidden}
.view-btn{padding:6px 12px;background:#fff;cursor:pointer;font-size:14px;transition:all .2s;border-right:1px solid #d9d9d9}
.view-btn:last-child{border-right:none}
.view-btn:hover{background:#f5f5f5}
.view-btn.on{background:#1677ff;color:#fff}
.prod-card{border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;cursor:pointer;transition:all .2s}
.prod-card:hover{border-color:#1677ff;box-shadow:0 4px 16px rgba(22,119,255,.1)}
.prod-img{height:120px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:40px}
.prod-info{padding:12px}
.prod-name{font-size:14px;font-weight:500;margin-bottom:4px}
.prod-price{font-size:16px;font-weight:700;color:#fa8c16;margin-bottom:4px}
.prod-stock{font-size:12px;color:#999;margin-bottom:8px}
.prod-actions{display:flex;gap:8px}

/* Tenant table */
.tenant-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#1677ff,#69b1ff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0}

/* Modal */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;align-items:center;justify-content:center}
.modal-overlay.active{display:flex}
.modal{background:#fff;border-radius:12px;width:90%;max-width:600px;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0}
.modal-header h3{font-size:16px;font-weight:600}
.modal-close{width:28px;height:28px;border-radius:6px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:background .2s}
.modal-close:hover{background:#e8e8e8}
.modal-body{padding:20px}
.modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;border-top:1px solid #f0f0f0}

/* Breadcrumb */
.breadcrumb{margin-bottom:16px;color:#999;font-size:13px}
.breadcrumb b{color:#333;font-weight:500}

/* ===== ALL ORIGINAL PAGE CSS ===== */
/* All designer file CSS included so extracted page content renders correctly */
${css(F['designer-1-enterprise-core.html'])}
${css(F['designer-2-enterprise-operations.html'])}
${css(F['designer-6-employee-deep.html'])}
${css(F['designer-7-department-team.html'])}
${css(F['designer-8-rbac-deep.html'])}
${css(F['designer-9-rule-engine-visual.html'])}
${css(F['designer-10-product-deep.html'])}
${css(F['designer-11-order-deep.html'])}
${css(F['designer-15-platform-admin-full.html'])}

/* H5 mobile styles */
${css(F['designer-12-h5-login-home-checkin.html'])}
${css(F['designer-13-h5-points-mall-coupons.html'])}
${css(F['designer-14-h5-profile-badges-msg.html'])}
</style>
</head>
<body>

<!-- ============================================================
     LOGIN PAGE
     ============================================================ -->
<div id="login-shell">
  <div class="login-bar">
    <div class="login-brand">
      <div class="dot"></div>
      碳积分打卡平台
    </div>
    <div class="nav-tab active" onclick="showLogin('ent')">企业管理员</div>
    <div class="nav-tab blue" onclick="showLogin('plat')">平台管理员</div>
  </div>

  <!-- Enterprise Login -->
  <div id="login-ent" class="login-bg bg-green">
    <div class="leaf" style="left:10%;animation-duration:14s;animation-delay:0s">&#127811;</div>
    <div class="leaf" style="left:85%;animation-duration:17s;animation-delay:3s">&#127807;</div>
    <div class="leaf" style="left:50%;animation-duration:20s;animation-delay:6s">&#127808;</div>
    <div class="leaf" style="left:30%;animation-duration:16s;animation-delay:2s">&#127810;</div>

    <div class="login-card">
      <div class="card-logo cl-green">&#128337;</div>
      <div class="card-title">企业管理员登录</div>
      <div class="card-sub">碳积分打卡平台 · 企业管理后台</div>

      <div class="form-group">
        <label class="form-label">手机号</label>
        <div class="input-wrap">
          <div class="input-icon">&#9742;</div>
          <input class="input" type="tel" placeholder="请输入手机号" id="ent-phone" value="13800138001">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">密码</label>
        <div class="input-wrap">
          <div class="input-icon">&#128274;</div>
          <input class="input" type="password" placeholder="请输入密码" id="ent-pwd" value="demo123">
          <div class="eye" onclick="togglePwd('ent-pwd')">&#128065;</div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">验证码</label>
        <div class="captcha-row">
          <div class="input-wrap" style="flex:1">
            <div class="input-icon">&#10003;</div>
            <input class="input" type="text" placeholder="请输入验证码" maxlength="4">
          </div>
          <div class="captcha-box" onclick="refreshCap()">
            <div class="captcha-inner">
              <span class="captcha-char">7</span><span class="captcha-char">K</span><span class="captcha-char">3</span><span class="captcha-char">R</span>
              <div class="captcha-noise"></div><div class="captcha-line"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="check-row">
        <div class="checkbox checked" onclick="this.classList.toggle('checked')">
          <div class="box">&#10003;</div>
          记住我
        </div>
        <a class="check-link">忘记密码？</a>
      </div>

      <button class="btn-login btn-green" onclick="doLogin('ent')">登 录</button>
      <div class="login-footer">登录即同意 <a href="javascript:void(0)">《用户服务协议》</a> 和 <a href="javascript:void(0)">《隐私政策》</a></div>
    </div>
  </div>

  <!-- Platform Login -->
  <div id="login-plat" class="login-bg bg-blue" style="display:none">
    <div class="login-card">
      <div class="card-logo cl-blue">&#922;</div>
      <div class="card-title">平台管理员登录</div>
      <div class="card-sub">碳积分打卡平台 · 平台运营中心</div>

      <div class="sec-tip">
        <div class="icon">&#128274;</div>
        <div>安全提醒：平台管理员账号仅限授权人员使用，所有操作将被记录审计。</div>
      </div>

      <div class="form-group">
        <label class="form-label">用户名</label>
        <div class="input-wrap">
          <div class="input-icon">&#128100;</div>
          <input class="input" type="text" placeholder="请输入用户名" id="plat-user" value="admin">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">密码</label>
        <div class="input-wrap">
          <div class="input-icon">&#128274;</div>
          <input class="input" type="password" placeholder="请输入密码" id="plat-pwd" value="admin123">
          <div class="eye" onclick="togglePwd('plat-pwd')">&#128065;</div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">验证码</label>
        <div class="captcha-row">
          <div class="input-wrap" style="flex:1">
            <div class="input-icon">&#10003;</div>
            <input class="input" type="text" placeholder="请输入验证码" maxlength="4">
          </div>
          <div class="captcha-box" onclick="refreshCap()">
            <div class="captcha-inner">
              <span class="captcha-char">5</span><span class="captcha-char">M</span><span class="captcha-char">9</span><span class="captcha-char">D</span>
              <div class="captcha-noise"></div><div class="captcha-line"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="check-row">
        <div class="checkbox checked" onclick="this.classList.toggle('checked')">
          <div class="box">&#10003;</div>
          记住我
        </div>
        <a class="check-link" style="color:#1677ff">忘记密码？</a>
      </div>

      <button class="btn-login btn-blue" onclick="doLogin('plat')">登 录</button>
      <div class="login-footer">登录即同意 <a href="javascript:void(0)" style="color:#1677ff">《平台运营协议》</a> 和 <a href="javascript:void(0)" style="color:#1677ff">《安全管理制度》</a></div>
    </div>
  </div>
</div>

<!-- ============================================================
     ENTERPRISE ADMIN SHELL
     ============================================================ -->
<div id="app-ent" class="app-shell">
  <div class="u-sidebar">
    <div class="u-sidebar-logo">
      <div class="ico">C</div>
      <span class="logo-text">碳积分 · 企业后台</span>
    </div>
    <div class="u-sidebar-scroll">
      <div class="menu-section">概览</div>
      <div class="menu-item active" onclick="switchEnt(this,'ent-dashboard')">
        <span class="mi">&#128202;</span><span class="ml">工作台</span>
      </div>
      <div class="menu-section">企业管理</div>
      <div class="menu-item" onclick="switchEnt(this,'ent-employees')">
        <span class="mi">&#128101;</span><span class="ml">员工管理</span>
      </div>
      <div class="menu-item" onclick="switchEnt(this,'ent-departments')">
        <span class="mi">&#127970;</span><span class="ml">部门管理</span>
      </div>
      <div class="menu-item" onclick="switchEnt(this,'ent-rbac')">
        <span class="mi">&#128737;</span><span class="ml">角色权限</span>
      </div>
      <div class="menu-section">运营管理</div>
      <div class="menu-item" onclick="switchEnt(this,'ent-rules')">
        <span class="mi">&#9881;</span><span class="ml">规则配置</span>
      </div>
      <div class="menu-item" onclick="switchEnt(this,'ent-products')">
        <span class="mi">&#127873;</span><span class="ml">商品管理</span>
      </div>
      <div class="menu-item" onclick="switchEnt(this,'ent-orders')">
        <span class="mi">&#128230;</span><span class="ml">订单管理</span>
      </div>
      <div class="menu-item" onclick="switchEnt(this,'ent-points')">
        <span class="mi">&#128176;</span><span class="ml">积分运营</span>
      </div>
      <div class="menu-item" onclick="switchEnt(this,'ent-reports')">
        <span class="mi">&#128200;</span><span class="ml">数据报表</span>
      </div>
    </div>
    <div class="u-sidebar-footer">
      <div class="menu-item" onclick="showH5()" style="color:#52c41a;padding:8px 12px;height:auto;margin:0;border-radius:6px">
        <span class="mi">&#128241;</span><span class="ml">预览H5移动端</span>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="top-header">
      <div class="breadcrumb">
        <span>首页</span><span>/</span><span class="cur" id="ent-bc">工作台</span>
      </div>
      <div class="right">
        <div class="icon-btn" title="通知">&#128276;</div>
        <div class="user" onclick="logout()">
          <div class="avatar">管</div>
          <span class="user-name">企业管理员</span>
          <span class="user-role">绿源科技</span>
        </div>
      </div>
    </div>
    <div class="content-area">
      <!-- Enterprise Dashboard -->
      <div class="page-content active" id="ent-dashboard">${ent1['page-dashboard'] || '<!-- page-dashboard not found -->'}</div>
      <!-- Employee List -->
      <div class="page-content" id="ent-employees">${empPages['page-employee-list'] || '<!-- page-employee-list not found -->'}</div>
      <!-- Departments -->
      <div class="page-content" id="ent-departments">${deptPages['page-dept'] || deptPages['page-detail'] || '<!-- dept pages not found -->'}</div>
      <!-- RBAC -->
      <div class="page-content" id="ent-rbac">${rbacPages['pageRoleList'] || '<!-- RBAC page not found -->'}</div>
      <!-- Rules -->
      <div class="page-content" id="ent-rules">${ruleContent || '<!-- rule engine not found -->'}</div>
      <!-- Products -->
      <div class="page-content" id="ent-products">${productContent || '<!-- products not found -->'}</div>
      <!-- Orders -->
      <div class="page-content" id="ent-orders">${orderContent || '<!-- orders not found -->'}</div>
      <!-- Points -->
      <div class="page-content" id="ent-points">${ent2['page-points'] || '<!-- points not found -->'}</div>
      <!-- Reports -->
      <div class="page-content" id="ent-reports">${ent2['page-reports'] || '<!-- reports not found -->'}</div>
    </div>
  </div>
</div>

<!-- ============================================================
     PLATFORM ADMIN SHELL
     ============================================================ -->
<div id="app-plat" class="app-shell">
  <div class="u-sidebar">
    <div class="u-sidebar-logo">
      <div class="ico purple">C</div>
      <span class="logo-text">碳积分 · 平台管理</span>
    </div>
    <div class="u-sidebar-scroll">
      <div class="menu-section">概览</div>
      <div class="menu-item active" onclick="switchPlat(this,'plt-dashboard')">
        <span class="mi">&#128202;</span><span class="ml">全平台看板</span>
      </div>
      <div class="menu-section">运营管理</div>
      <div class="menu-item" onclick="switchPlat(this,'plt-tenants')">
        <span class="mi">&#127970;</span><span class="ml">企业管理</span>
      </div>
      <div class="menu-item" onclick="switchPlat(this,'plt-config')">
        <span class="mi">&#9881;</span><span class="ml">平台配置</span>
      </div>
      <div class="menu-section">系统管理</div>
      <div class="menu-item" onclick="switchPlat(this,'plt-admins')">
        <span class="mi">&#128100;</span><span class="ml">管理员管理</span>
      </div>
      <div class="menu-item" onclick="switchPlat(this,'plt-logs')">
        <span class="mi">&#128220;</span><span class="ml">操作日志</span>
      </div>
      <div class="menu-item" onclick="switchPlat(this,'plt-security')">
        <span class="mi">&#128274;</span><span class="ml">安全配置</span>
      </div>
    </div>
    <div class="u-sidebar-footer">
      <div class="menu-item" onclick="showH5()" style="color:#52c41a;padding:8px 12px;height:auto;margin:0;border-radius:6px">
        <span class="mi">&#128241;</span><span class="ml">预览H5移动端</span>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="top-header">
      <div class="breadcrumb">
        <span>首页</span><span>/</span><span class="cur" id="plat-bc">全平台看板</span>
      </div>
      <div class="right">
        <div class="icon-btn" title="通知">&#128276;</div>
        <div class="user" onclick="logout()">
          <div class="avatar purple">超</div>
          <span class="user-name">超级管理员</span>
          <span class="user-role">平台</span>
        </div>
      </div>
    </div>
    <div class="content-area">
      <div class="page-content active" id="plt-dashboard">${pltPages['page-dashboard'] || '<!-- dashboard not found -->'}</div>
      <div class="page-content" id="plt-tenants">${pltPages['page-tenants'] || '<!-- tenants not found -->'}</div>
      <div class="page-content" id="plt-config">${pltPages['page-config'] || '<!-- config not found -->'}</div>
      <div class="page-content" id="plt-admins">${pltPages['page-admins'] || '<!-- admins not found -->'}</div>
      <div class="page-content" id="plt-logs">${pltPages['page-logs'] || '<!-- logs not found -->'}</div>
      <div class="page-content" id="plt-security">${pltPages['page-security'] || '<!-- security not found -->'}</div>
    </div>
  </div>
</div>

<!-- ============================================================
     H5 PREVIEW MODAL
     ============================================================ -->
<div id="h5-modal" class="h5-modal">
  <div class="h5-frame">
    <div class="h5-header">
      <span>H5 移动端预览</span>
      <div class="h5-close" onclick="closeH5()">&#10005;</div>
    </div>
    <div class="h5-tabs">
      <div class="h5-tab active" onclick="switchH5(0,this)">首页/打卡</div>
      <div class="h5-tab" onclick="switchH5(1,this)">积分/商城</div>
      <div class="h5-tab" onclick="switchH5(2,this)">个人中心</div>
    </div>
    <div class="h5-screen">
      <div class="h5-page active" id="h5-p0">
        <iframe src="designer-12-h5-login-home-checkin.html" style="width:375px;height:100%;border:none"></iframe>
      </div>
      <div class="h5-page" id="h5-p1">
        <iframe src="designer-13-h5-points-mall-coupons.html" style="width:375px;height:100%;border:none"></iframe>
      </div>
      <div class="h5-page" id="h5-p2">
        <iframe src="designer-14-h5-profile-badges-msg.html" style="width:375px;height:100%;border:none"></iframe>
      </div>
    </div>
  </div>
</div>

<script>
// ==================== UNIFIED JS ====================
const entNames = {
  'ent-dashboard':'工作台','ent-employees':'员工管理','ent-departments':'部门管理',
  'ent-rbac':'角色权限','ent-rules':'规则配置','ent-products':'商品管理',
  'ent-orders':'订单管理','ent-points':'积分运营','ent-reports':'数据报表'
};
const platNames = {
  'plt-dashboard':'全平台看板','plt-tenants':'企业管理','plt-config':'平台配置',
  'plt-admins':'管理员管理','plt-logs':'操作日志','plt-security':'安全配置'
};

function showLogin(type) {
  document.getElementById('login-ent').style.display = type === 'ent' ? 'flex' : 'none';
  document.getElementById('login-plat').style.display = type === 'plat' ? 'flex' : 'none';
  document.querySelectorAll('.nav-tab')[0].classList.toggle('active', type === 'ent');
  document.querySelectorAll('.nav-tab')[1].classList.toggle('active', type === 'plat');
  document.querySelectorAll('.nav-tab')[1].classList.toggle('blue', type === 'plat');
}

function togglePwd(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function refreshCap() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  document.querySelectorAll('.captcha-char').forEach(function(el){ el.textContent = chars[Math.floor(Math.random()*chars.length)]; });
}

function doLogin(type) {
  document.getElementById('login-shell').style.display = 'none';
  if (type === 'ent') {
    document.getElementById('app-ent').classList.add('active');
  } else {
    document.getElementById('app-plat').classList.add('active');
  }
}

function logout() {
  document.getElementById('app-ent').classList.remove('active');
  document.getElementById('app-plat').classList.remove('active');
  document.getElementById('login-shell').style.display = 'flex';
  showLogin('ent');
}

function switchEnt(el, pageId) {
  document.querySelectorAll('#app-ent .page-content').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('#app-ent .menu-item').forEach(function(m){ m.classList.remove('active'); });
  var page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  if (el) el.classList.add('active');
  var bc = document.getElementById('ent-bc');
  if (bc) bc.textContent = entNames[pageId] || pageId;
}

function switchPlat(el, pageId) {
  document.querySelectorAll('#app-plat .page-content').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('#app-plat .menu-item').forEach(function(m){ m.classList.remove('active'); });
  var page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  if (el) el.classList.add('active');
  var bc = document.getElementById('plat-bc');
  if (bc) bc.textContent = platNames[pageId] || pageId;
}

function showH5() { document.getElementById('h5-modal').classList.add('active'); }
function closeH5() { document.getElementById('h5-modal').classList.remove('active'); }
function switchH5(idx, el) {
  document.querySelectorAll('.h5-page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.h5-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('h5-p'+idx).classList.add('active');
  if (el) el.classList.add('active');
}

document.getElementById('h5-modal').addEventListener('click', function(e){
  if (e.target === this) closeH5();
});

// ===== ORIGINAL PAGE JS (deduplicated) =====
${deduplicateJS([
  js(F['designer-15-platform-admin-full.html']),
  js(F['designer-9-rule-engine-visual.html']),
  js(F['designer-11-order-deep.html']),
  js(F['designer-10-product-deep.html']),
  js(F['designer-12-h5-login-home-checkin.html']),
  js(F['designer-13-h5-points-mall-coupons.html']),
  js(F['designer-14-h5-profile-badges-msg.html'])
].join('\n'))}
</script>

</body>
</html>`;

write('unified-saas-platform.html', OUT);
console.log('Done! Size:', (Buffer.byteLength(OUT)/1024).toFixed(0), 'KB');
