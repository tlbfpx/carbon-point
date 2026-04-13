#!/usr/bin/env node
/**
 * Build script v2: Create a clean unified SaaS platform HTML
 *
 * Strategy: Instead of extracting CSS (which causes conflicts),
 * we include the unified CSS first (base components), then add
 * page-specific CSS with higher specificity.
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

function read(name) {
  return fs.readFileSync(path.join(DIR, name), 'utf-8');
}

// Extract full body content
function body(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : '';
}

// Extract CSS from style tags, cleaning duplicates
function css(html) {
  const matches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (!matches) return '';
  return matches.join('\n');
}

// Extract script content
function js(html) {
  const matches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (!matches) return '';
  return matches.map(s => s.replace(/<\/?script[^>]*>/gi, '')).join('\n');
}

// Extract page content by looking for the div with that id
function page(html, id) {
  const startRe = new RegExp(`<div[^>]*id="${id}"[^>]*>`);
  const m = html.match(startRe);
  if (!m) return `<!-- Page ${id} not found -->`;
  const start = html.indexOf(m[0]);
  let depth = 1;
  let pos = start + m[0].length;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.substring(start + m[0].length, nextClose);
      }
      pos = nextClose + 6;
    }
  }
  return `<!-- Page ${id} extraction failed -->`;
}

// Extract content between patterns
function between(html, startRe, endRe) {
  if (typeof startRe === 'string') {
    startRe = new RegExp(startRe);
  }
  const sm = html.match(startRe);
  if (!sm) return '';
  const idx = sm.index + sm[0].length;
  const em = html.substring(idx).match(endRe);
  if (!em) return html.substring(idx);
  return html.substring(idx, idx + em.index);
}

console.log('Reading source files...');
const F = {};
[
  'designer-1-enterprise-core.html',
  'designer-2-enterprise-operations.html',
  'designer-3-platform-admin.html',
  'designer-5-login-auth.html',
  'designer-6-employee-deep.html',
  'designer-7-department-team.html',
  'designer-8-rbac-deep.html',
  'designer-9-rule-engine-visual.html',
  'designer-10-product-deep.html',
  'designer-11-order-deep.html',
  'designer-12-h5-login-home-checkin.html',
  'designer-13-h5-points-mall-coupons.html',
  'designer-14-h5-profile-badges-msg.html',
  'designer-15-platform-admin-full.html',
].forEach(f => F[f] = read(f));

// =====================================================
// BUILD
// =====================================================

const UNIFIED_CSS = `
/* ============================================
   UNIFIED CSS FRAMEWORK
   ============================================ */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Helvetica,Arial,sans-serif;font-size:14px;color:rgba(0,0,0,.88);line-height:1.5714;min-height:100vh;overflow-x:hidden}
body{background:#f5f5f5}
a{color:inherit;text-decoration:none;cursor:pointer}
input,select,textarea,button{font-family:inherit;font-size:inherit}
button{cursor:pointer;border:none;background:none}

/* ===== APP SHELLS ===== */
#login-page{display:block}
#app-enterprise,#app-platform{display:none}

/* Sidebar */
.sidebar{width:220px;background:#001529;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto}
.sidebar-logo{height:64px;display:flex;align-items:center;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.sidebar-logo .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,#1677ff,#69b1ff);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;margin-right:10px;flex-shrink:0}
.sidebar-logo .logo-icon.purple{background:linear-gradient(135deg,#722ed1,#b37feb)}
.sidebar-logo span{color:#fff;font-size:15px;font-weight:600;white-space:nowrap}
.sidebar-menu{flex:1;padding:8px 0;overflow-y:auto}
.menu-section{padding:16px 20px 6px;font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.5px;font-weight:500;text-transform:uppercase}
.menu-item{display:flex;align-items:center;padding:0 20px;height:42px;color:rgba(255,255,255,.65);font-size:14px;cursor:pointer;transition:all .2s;position:relative}
.menu-item:hover{color:#fff;background:rgba(255,255,255,.06)}
.menu-item.active{color:#fff;background:#1677ff}
.menu-item .menu-icon{width:18px;height:18px;margin-right:10px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.menu-item .menu-label{flex:1;white-space:nowrap}
.sidebar-footer{padding:12px 20px;border-top:1px solid rgba(255,255,255,.08)}

/* Header */
.header-bar{position:fixed;top:0;left:220px;right:0;height:64px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px;box-shadow:0 1px 4px rgba(0,0,0,.06);z-index:99}
.header-left{display:flex;align-items:center}
.breadcrumb{display:flex;align-items:center;color:rgba(0,0,0,.45);font-size:14px}
.breadcrumb .bc-sep{margin:0 8px;font-size:12px}
.breadcrumb .bc-current{color:rgba(0,0,0,.88);font-weight:500}
.header-right{display:flex;align-items:center;gap:16px}
.header-action{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.45);cursor:pointer;transition:all .2s;font-size:17px}
.header-action:hover{background:#f5f5f5;color:rgba(0,0,0,.88)}
.user-info{display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 8px;border-radius:8px;transition:background .2s}
.user-info:hover{background:#f5f5f5}
.user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1677ff,#69b1ff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600}
.user-avatar.purple{background:linear-gradient(135deg,#722ed1,#b37feb)}
.user-name{font-size:14px;color:rgba(0,0,0,.88)}
.user-role{font-size:11px;color:rgba(0,0,0,.45);margin-left:4px;background:#f0f0f0;padding:1px 6px;border-radius:4px}

/* Main Content */
.main-content{margin-left:220px;margin-top:64px;padding:20px 24px;min-height:calc(100vh - 64px)}

/* Pages */
.page,.page-container{display:none}
.page.active,.page-container.active{display:block}

/* Common Components */
.card{background:#fff;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.03),0 1px 6px -1px rgba(0,0,0,.02),0 2px 4px rgba(0,0,0,.02);padding:20px 24px;margin-bottom:20px}
.card-title{font-size:16px;font-weight:600;color:rgba(0,0,0,.88);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
.card-title .subtitle{font-size:13px;color:rgba(0,0,0,.45);font-weight:400}
.tabs{display:flex;border-bottom:1px solid #f0f0f0;margin-bottom:20px}
.tab-item{padding:10px 20px;font-size:14px;color:rgba(0,0,0,.65);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.tab-item:hover{color:#1677ff}
.tab-item.active{color:#1677ff;border-bottom-color:#1677ff;font-weight:500}
.tab-content{display:none}
.tab-content.active{display:block}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:5px 16px;border-radius:6px;font-size:14px;height:34px;line-height:1.5714;transition:all .2s;font-weight:400;white-space:nowrap}
.btn-primary{background:#1677ff;color:#fff;border:1px solid #1677ff}
.btn-primary:hover{background:#4096ff;border-color:#4096ff}
.btn-default{background:#fff;color:rgba(0,0,0,.88);border:1px solid #d9d9d9}
.btn-default:hover{color:#1677ff;border-color:#1677ff}
.btn-danger{background:#ff4d4f;color:#fff;border:1px solid #ff4d4f}
.btn-danger:hover{background:#ff7875;border-color:#ff7875}
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
input[type="text"],input[type="tel"],input[type="password"],input[type="number"],input[type="date"],select{height:36px;border:1px solid #d9d9d9;border-radius:6px;padding:0 12px;font-size:14px;outline:none;transition:border-color .2s;background:#fff}
input:focus,select:focus{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.15)}
.pagination{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:16px;font-size:13px;color:#666}
.page-btn{width:32px;height:32px;border:1px solid #d9d9d9;border-radius:6px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .2s}
.page-btn:hover,.page-btn.active{border-color:#1677ff;color:#1677ff}
.page-btn.active{background:#1677ff;color:#fff}
.stat-grid{display:grid;gap:16px;margin-bottom:20px}
.stat-grid-3{grid-template-columns:repeat(3,1fr)}
.stat-grid-4{grid-template-columns:repeat(4,1fr)}
.stat-grid-5{grid-template-columns:repeat(5,1fr)}
.stat-card{background:#fff;border-radius:8px;padding:20px;border:1px solid #f0f0f0;position:relative;overflow:hidden}
.stat-label{font-size:13px;color:rgba(0,0,0,.45);margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;color:rgba(0,0,0,.88);line-height:1.2}
.stat-change{margin-top:8px;font-size:12px;display:flex;align-items:center;gap:4px}
.stat-change.up{color:#52c41a}
.stat-change.down{color:#ff4d4f}
.stat-icon{position:absolute;top:20px;right:20px;width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px}
.stat-icon.blue{background:#e6f4ff;color:#1677ff}
.stat-icon.green{background:#f6ffed;color:#52c41a}
.stat-icon.orange{background:#fff7e6;color:#fa8c16}
.stat-icon.purple{background:#f9f0ff;color:#722ed1}
.stat-icon.cyan{background:#e6fffb;color:#13c2c2}
.toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.toolbar-left{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px}
.kpi-card{background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.kpi-card .label{font-size:14px;color:#888;margin-bottom:8px}
.kpi-card .value{font-size:32px;font-weight:700;color:#333}
.kpi-card .suffix{font-size:14px;font-weight:400;color:#999;margin-left:4px}
.kpi-card .trend{margin-top:8px;font-size:13px}
.kpi-card .trend.up{color:#52c41a}
.kpi-card .trend.down{color:#ff4d4f}

/* H5 Modal */
.h5-modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.h5-modal.active{display:flex}
.h5-modal-content{position:relative;width:440px;height:calc(100vh - 40px);max-height:880px;background:#1a1a1a;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.h5-modal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#2a2a2a;color:#fff;font-size:14px;font-weight:500}
.h5-modal-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;font-size:16px;transition:background .2s}
.h5-modal-close:hover{background:rgba(255,255,255,.2)}
.h5-frame-container{width:375px;height:calc(100% - 80px);margin:0 auto;overflow:hidden;background:#f5f5f5;position:relative;overflow-y:auto;overflow-x:hidden}
.h5-tabs{display:flex;gap:4px;padding:8px 12px;background:#2a2a2a;border-bottom:1px solid rgba(255,255,255,.1)}
.h5-tab{padding:4px 12px;border-radius:4px;font-size:12px;color:rgba(255,255,255,.5);cursor:pointer;transition:all .2s}
.h5-tab:hover{color:rgba(255,255,255,.8)}
.h5-tab.active{background:#52c41a;color:#fff}
.h5-page{display:none;position:relative;width:100%;min-height:100%}
.h5-page.active{display:block}
`;

// Get page-specific CSS - strip global resets and conflicting layout rules
function pageCSS(html) {
  const cssBlock = css(html);
  // Strip the global reset from the beginning (first ~30 lines)
  const lines = cssBlock.split('\n');
  const resetEnd = lines.findIndex((l, i) => i > 5 && l.includes('body{'));
  let content = resetEnd > 5 ? lines.slice(resetEnd).join('\n') : cssBlock;

  // Remove global layout rules that conflict (multi-line safe)
  const toRemove = ['.sidebar', '.sidebar-logo', '.sidebar-menu', '.header-bar', '.main-content', '.main', '.layout', '.content', '.page', '.page-container'];
  toRemove.forEach(sel => {
    const re = new RegExp(sel.replace('.', '\\.') + '[\\s\\S]*?\\}', 'g');
    content = content.replace(re, '');
  });

  // Remove :root { } blocks (CSS variables)
  content = content.replace(/:root\s*\{[\s\S]*?\}/g, '');

  return content;
}

console.log('Building unified HTML...');

const output = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>碳积分打卡平台 - SaaS 管理后台</title>

<style>
${UNIFIED_CSS}

/* ============================================
   PAGE-SPECIFIC STYLES
   ============================================ */

/* --- LOGIN PAGE --- */
.page-nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:#fff;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;justify-content:center;height:52px;gap:4px;padding:0 16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.page-nav .nav-brand{position:absolute;left:20px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;color:#52c41a}
.page-nav .nav-brand .brand-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#52c41a,#73d13d);animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.8)}}
.nav-tab{padding:6px 16px;border-radius:6px;font-size:13px;color:rgba(0,0,0,.65);cursor:pointer;transition:all .25s;white-space:nowrap;position:relative;font-weight:500}
.nav-tab:hover{color:rgba(0,0,0,.88);background:rgba(0,0,0,.04)}
.nav-tab.active{color:#fff;background:linear-gradient(135deg,#52c41a,#73d13d);box-shadow:0 2px 8px rgba(82,196,26,.3)}
.nav-tab.tab-blue.active{background:linear-gradient(135deg,#1677ff,#4096ff);box-shadow:0 2px 8px rgba(22,119,255,.3)}
.auth-page{display:none;min-height:100vh;padding-top:52px;position:relative}
.auth-page.active{display:flex;align-items:center;justify-content:center}
.bg-green{background:linear-gradient(135deg,#f0f9eb 0%,#e8f5e0 30%,#d9f2c6 60%,#c5e8a0 100%)}
.bg-green::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 20% 50%,rgba(82,196,26,.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(115,209,61,.06) 0%,transparent 50%),radial-gradient(ellipse at 50% 80%,rgba(135,208,104,.05) 0%,transparent 50%);pointer-events:none}
.bg-blue{background:linear-gradient(135deg,#e6f4ff 0%,#d6e4ff 30%,#adc6ff 60%,#85b8ff 100%)}
.bg-blue::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 20% 50%,rgba(22,119,255,.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 30%,rgba(64,150,255,.06) 0%,transparent 50%);pointer-events:none}
.auth-card{width:100%;max-width:420px;position:relative;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(20px);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.08),0 2px 8px rgba(0,0,0,.04);padding:40px 36px;border:1px solid rgba(255,255,255,.6);animation:cardIn .5s ease-out}
@keyframes cardIn{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.card-header{text-align:center;margin-bottom:32px}
.card-logo{width:56px;height:56px;border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff}
.card-logo.logo-green{background:linear-gradient(135deg,#52c41a,#73d13d);box-shadow:0 4px 16px rgba(82,196,26,.3)}
.card-logo.logo-blue{background:linear-gradient(135deg,#1677ff,#4096ff);box-shadow:0 4px 16px rgba(22,119,255,.3)}
.card-title{font-size:22px;font-weight:700;margin-bottom:4px;text-align:center}
.card-subtitle{font-size:13px;color:rgba(0,0,0,.45);text-align:center}
.form-group{margin-bottom:20px}
.form-label{display:block;font-size:14px;font-weight:500;margin-bottom:6px}
.form-input-wrap{position:relative;display:flex;align-items:center;border:1px solid #d9d9d9;border-radius:8px;transition:all .3s;background:#fff}
.form-input-wrap:hover{border-color:#4096ff}
.form-input-wrap.focused{border-color:#52c41a;box-shadow:0 0 0 3px rgba(82,196,26,.1)}
.form-input-wrap.focused-blue{border-color:#1677ff;box-shadow:0 0 0 3px rgba(22,119,255,.1)}
.form-input-icon{width:40px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.25);font-size:16px;flex-shrink:0}
.form-input{flex:1;border:none;outline:none;padding:10px 12px 10px 0;font-size:14px;color:rgba(0,0,0,.88);background:transparent;height:42px}
.form-input::placeholder{color:rgba(0,0,0,.25)}
.pwd-toggle{width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(0,0,0,.25);transition:color .2s;border-radius:6px;font-size:16px}
.pwd-toggle:hover{color:rgba(0,0,0,.45)}
.captcha-row{display:flex;gap:10px;align-items:center}
.captcha-canvas{width:120px;height:42px;border-radius:8px;cursor:pointer;position:relative;overflow:hidden;flex-shrink:0;border:1px solid #d9d9d9;background:#fff}
.captcha-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;user-select:none}
.captcha-char{font-size:22px;font-weight:700;font-style:italic;display:inline-block;position:relative}
.captcha-noise{position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.03) 3px,rgba(0,0,0,.03) 4px),repeating-linear-gradient(-30deg,transparent,transparent 5px,rgba(0,0,0,.02) 5px,rgba(0,0,0,.02) 6px);pointer-events:none}
.captcha-line{position:absolute;width:80%;height:2px;background:rgba(0,0,0,.08);top:50%;left:10%;transform:rotate(-5deg);pointer-events:none}
.captcha-refresh{position:absolute;bottom:2px;right:4px;font-size:10px;color:rgba(0,0,0,.3)}
.form-checkbox{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:rgba(0,0,0,.65);user-select:none}
.checkbox-box{width:16px;height:16px;border:1px solid #d9d9d9;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .2s;font-size:10px;color:#fff;background:#fff}
.form-checkbox.checked .checkbox-box{background:#52c41a;border-color:#52c41a}
.form-checkbox.blue.checked .checkbox-box{background:#1677ff;border-color:#1677ff}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:0 20px;height:42px;border-radius:8px;font-size:15px;font-weight:600;transition:all .3s;cursor:pointer;white-space:nowrap;width:100%}
.btn-green{background:linear-gradient(135deg,#52c41a,#73d13d);color:#fff;border:none;box-shadow:0 4px 12px rgba(82,196,26,.3)}
.btn-green:hover{background:linear-gradient(135deg,#73d13d,#95de64);box-shadow:0 6px 16px rgba(82,196,26,.4);transform:translateY(-1px)}
.btn-blue{background:linear-gradient(135deg,#1677ff,#4096ff);color:#fff;border:none;box-shadow:0 4px 12px rgba(22,119,255,.3)}
.btn-blue:hover{background:linear-gradient(135deg,#4096ff,#69b1ff);box-shadow:0 6px 16px rgba(22,119,255,.4);transform:translateY(-1px)}
.btn-lg{height:46px;font-size:16px;border-radius:10px}
.form-footer{display:flex;align-items:center;justify-content:space-between;margin-top:20px;font-size:13px}
.form-link{color:#52c41a;font-weight:500;cursor:pointer;transition:color .2s}
.form-link:hover{color:#73d13d}
.form-link.blue{color:#1677ff}
.security-banner{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:8px;margin-bottom:20px;font-size:13px;line-height:1.5}
.security-banner.info{background:#e6f4ff;border:1px solid #91caff;color:#0958d9}
.security-banner-icon{font-size:16px;flex-shrink:0;margin-top:1px}
.leaf{position:absolute;pointer-events:none;opacity:.15;font-size:24px;animation:floatLeaf linear infinite}
@keyframes floatLeaf{0%{transform:translateY(0) rotate(0deg);opacity:.15}50%{opacity:.08}100%{transform:translateY(-100vh) rotate(360deg);opacity:0}}

/* --- RULE ENGINE FLOW CHART --- */
.flow-banner{background:linear-gradient(135deg,#f0f5ff,#e6f4ff);border:1px solid #adc6ff;border-radius:12px;padding:20px 24px;margin-bottom:20px}
.flow-title{font-size:16px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.flow-badge{background:#1677ff;color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:400;margin-left:auto}
.flow-chain{display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap}
.flow-step{cursor:pointer;text-align:center;position:relative}
.flow-step-box{background:#fff;border:2px solid #d9d9d9;border-radius:10px;padding:10px 14px;min-width:80px;transition:all .2s;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.flow-step.active .flow-step-box{border-color:#1677ff;background:#e6f4ff;box-shadow:0 4px 12px rgba(22,119,255,.2)}
.flow-step-num{font-size:12px;font-weight:700;color:#1677ff;margin-bottom:2px}
.flow-step-icon{font-size:20px;margin:2px 0}
.flow-step-label{font-size:11px;color:rgba(0,0,0,.65)}
.flow-arrow{width:24px;height:2px;background:#d9d9d9;position:relative;margin:0 4px}
.flow-arrow::after{content:'';position:absolute;right:-2px;top:-3px;border:4px solid transparent;border-left-color:#d9d9d9}
.flow-desc{font-size:12px;color:rgba(0,0,0,.45);text-align:center;margin-top:12px}
.tooltip{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#001529;color:#fff;font-size:12px;padding:6px 10px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s;z-index:10}
.flow-step:hover .tooltip{opacity:1}
.info-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:#f0f5ff;border-left:3px solid #1677ff;border-radius:0 6px 6px 0;font-size:13px;color:#1677ff;margin-bottom:16px}
.info-alert-icon{font-size:14px;flex-shrink:0;margin-top:1px}

/* Level cards */
.level-cards{display:flex;gap:16px;flex-wrap:wrap}
.level-card{border-radius:12px;padding:20px;min-width:140px;cursor:pointer;transition:all .2s;text-align:center;border:2px solid transparent}
.level-card:hover{border-color:#1677ff;transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}
.level-card.current{border-color:#1677ff;box-shadow:0 4px 16px rgba(22,119,255,.15)}
.level-card.lc-bronze{background:linear-gradient(135deg,#fff7e6,#ffe7ba);border-color:#ffd591}
.level-card.lc-silver{background:linear-gradient(135deg,#f5f5f5,#e8e8e8);border-color:#d9d9d9}
.level-card.lc-gold{background:linear-gradient(135deg,#fffbe6,#fff1b8);border-color:#ffe58f}
.level-card.lc-platinum{background:linear-gradient(135deg,#f0f5ff,#d6e4ff);border-color:#91caff}
.level-card.lc-diamond{background:linear-gradient(135deg,#f9f0ff,#d3adf7);border-color:#b37feb}
.level-card-icon{font-size:28px;font-weight:800;margin-bottom:4px}
.level-card-name{font-size:14px;font-weight:600;margin-bottom:2px}
.level-card-range{font-size:11px;color:rgba(0,0,0,.45);margin-bottom:6px}
.level-card-coeff{font-size:20px;font-weight:700;color:#1677ff;margin-bottom:4px}
.level-card-desc{font-size:11px;color:rgba(0,0,0,.45)}

/* Calendar */
.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.calendar-header-cell{text-align:center;font-size:12px;color:rgba(0,0,0,.45);padding:4px;font-weight:500}
.calendar-cell{text-align:center;padding:8px;border-radius:6px;font-size:13px;cursor:pointer;transition:all .2s;position:relative}
.calendar-cell:hover{background:#f0f0f0}
.calendar-cell.empty{background:transparent}
.calendar-cell.has-event{background:#e6f4ff;color:#1677ff;font-weight:600}
.calendar-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#1677ff;color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center}

/* Gauge */
.gauge-container{display:flex;gap:32px;align-items:center;padding:16px 0}
.gauge-visual{position:relative;width:180px;height:180px;flex-shrink:0}
.gauge-bg{position:absolute;inset:0;border-radius:50%;background:#f0f0f0}
.gauge-fill{position:absolute;inset:0;border-radius:50%;background:conic-gradient(#1677ff 0deg,#1677ff 135deg,transparent 135deg);transform:rotate(-135deg)}
.gauge-center{position:absolute;inset:16px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}
.gauge-value{font-size:36px;font-weight:700;color:#1677ff}
.gauge-unit{font-size:13px;color:rgba(0,0,0,.45)}

/* Slider */
.slider-track{width:100%;height:6px;background:#f0f0f0;border-radius:3px;position:relative;cursor:pointer}
.slider-fill{height:100%;background:#1677ff;border-radius:3px}
.slider-thumb{width:16px;height:16px;background:#1677ff;border-radius:50%;position:absolute;top:50%;transform:translateY(-50%);box-shadow:0 2px 6px rgba(22,119,255,.3)}

/* Timeline for rule engine */
.timeline-container{position:relative;padding:20px 0}
.timeline-bar{position:relative;height:48px;background:#f5f5f5;border-radius:8px;display:flex;overflow:hidden;margin-bottom:8px}
.timeline-hour-marks{position:absolute;inset:0;display:flex;pointer-events:none}
.timeline-hour-mark{flex:1;border-right:1px solid rgba(0,0,0,.05)}
.timeline-slot{position:absolute;top:4px;bottom:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;cursor:pointer;transition:opacity .2s}
.timeline-slot:hover{opacity:.85}
.timeline-slot.morning{background:#fa8c16}
.timeline-slot.afternoon,.timeline-slot.noon{background:#52c41a}
.timeline-slot.evening{background:#722ed1}
.timeline-slot.weekend{background:#eb2f96}
.timeline-slot.night{background:#2f54eb}
.timeline-label-row{display:flex;margin-bottom:8px}
.timeline-label{flex:1;font-size:11px;color:rgba(0,0,0,.35);text-align:center}
.timeline-legend{display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:12px;color:rgba(0,0,0,.45)}
.timeline-legend-item{display:flex;align-items:center;gap:4px}
.timeline-legend-dot{width:10px;height:10px;border-radius:2px}
.timeline-legend-dot{width:10px;height:10px;border-radius:2px}

/* Staircase */
.staircase-chart{display:flex;gap:8px;align-items:flex-end;height:200px;padding:20px 0 0}
.staircase-bar-wrapper{text-align:center;flex:1}
.staircase-bar{width:100%;min-height:20px;border-radius:6px 6px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:8px;cursor:pointer;transition:all .2s}
.staircase-bar:hover{transform:scaleY(1.02)}
.staircase-bar.s1{background:linear-gradient(180deg,#b7eb8f,#52c41a);height:30%}
.staircase-bar.s2{background:linear-gradient(180deg,#95de64,#73d13d);height:50%}
.staircase-bar.s3{background:linear-gradient(180deg,#73d13d,#389e0d);height:65%}
.staircase-bar.s4{background:linear-gradient(180deg,#52c41a,#237804);height:80%}
.staircase-bar.s5{background:linear-gradient(180deg,#389e0d,#135e00);height:92%}
.staircase-bar.s6{background:linear-gradient(180deg,#237804,#092b05);height:100%}
.bar-points{font-size:14px;font-weight:700;color:#fff}
.bar-unit{font-size:10px;color:rgba(255,255,255,.7)}
.staircase-label{font-size:12px;font-weight:600;margin-top:6px;color:rgba(0,0,0,.88)}
.staircase-sublabel{font-size:11px;color:rgba(0,0,0,.45)}

/* Section icon in card */
.section-icon{width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-right:8px}

/* Calendar date list */
.date-list{display:flex;flex-direction:column;gap:8px}
.date-list-item{display:flex;align-items:center;gap:12px;padding:12px;background:#fafafa;border-radius:8px;cursor:pointer;transition:all .2s}
.date-list-item:hover{background:#f0f0f0}
.date-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.date-dot.x2{background:#1677ff}
.date-dot.x3{background:#fa8c16}
.date-dot.x5{background:#ff4d4f}
.date-info{flex:1}
.date-name{font-size:14px;font-weight:500}
.date-desc{font-size:12px;color:rgba(0,0,0,.45);margin-top:2px}
.date-multiplier{font-size:16px;font-weight:700;flex-shrink:0}
.date-multiplier.x2{color:#1677ff}
.date-multiplier.x3{color:#fa8c16}
.date-multiplier.x5{color:#ff4d4f}
.date-recurring{font-size:10px;color:#52c41a;background:#f6ffed;padding:1px 6px;border-radius:4px;border:1px solid #b7eb8f}
.calendar-month-title{font-size:15px;font-weight:600;text-align:center;margin-bottom:12px}

/* Config grid */
.config-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.config-item{padding:12px;background:#fafafa;border-radius:8px}
.config-label{font-size:13px;font-weight:500;color:rgba(0,0,0,.85)}
.config-desc{font-size:12px;color:rgba(0,0,0,.35);margin-top:2px}
.form-control{height:36px;border:1px solid #d9d9d9;border-radius:6px;padding:0 12px;font-size:14px;outline:none;background:#fff;width:100%}
.number-input{display:flex;align-items:center;gap:0;margin-top:4px}
.num-btn{width:32px;height:36px;background:#f0f0f0;border:1px solid #d9d9d9;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;font-weight:600;transition:background .2s;flex-shrink:0}
.num-btn:hover{background:#e8e8e8}
.number-input input{width:60px;height:36px;border:1px solid #d9d9d9;border-left:none;border-right:none;text-align:center;font-size:14px;outline:none}

/* Switch */
.switch{display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer}
.switch-track{width:40px;height:22px;background:#d9d9d9;border-radius:11px;position:relative;transition:background .2s;flex-shrink:0}
.switch-track.on{background:#52c41a}
.switch-thumb{width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.switch-track.on .switch-thumb{left:20px}

/* Security card */
.security-card{background:#fff;border-radius:8px;border:1px solid #f0f0f0;margin-bottom:16px;overflow:hidden}
.security-card-header{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #f0f0f0}
.sc-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.sc-title{font-size:15px;font-weight:600}
.sc-desc{font-size:13px;color:rgba(0,0,0,.45);margin-top:2px}
.security-card-body{padding:20px}

/* Platform Admin Stats */
.platform-stat-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px}
.platform-stat-card{background:#fff;border-radius:8px;padding:16px;border:1px solid #f0f0f0;cursor:pointer;transition:all .2s}
.platform-stat-card:hover{border-color:#1677ff;box-shadow:0 2px 8px rgba(22,119,255,.1)}
.platform-stat-label{font-size:12px;color:rgba(0,0,0,.45);margin-bottom:6px}
.platform-stat-value{font-size:22px;font-weight:700;color:rgba(0,0,0,.88)}
.platform-stat-change{font-size:11px;margin-top:4px}
.platform-stat-change.up{color:#52c41a}
.platform-stat-change.down{color:#ff4d4f}

/* Order stats */
.stat-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:20px}
.stat-card{background:#fff;border-radius:8px;padding:16px;border:1px solid #f0f0f0;cursor:pointer;transition:all .2s}
.stat-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.06)}
.sc-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.sc-title{font-size:13px;color:rgba(0,0,0,.65)}
.sc-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.sc-value{font-size:28px;font-weight:700}
.sc-footer{font-size:12px;color:rgba(0,0,0,.45);margin-top:4px}

/* Tenant table */
.tenant-row{cursor:pointer;transition:background .2s}
.tenant-row:hover td{background:#f5f5ff}
.tenant-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#1677ff,#69b1ff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600}

/* Employee avatar */
.emp-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1677ff,#69b1ff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
.emp-avatar.green{background:linear-gradient(135deg,#52c41a,#73d13d)}
.emp-avatar.orange{background:linear-gradient(135deg,#fa8c16,#ffa940)}
.emp-avatar.purple{background:linear-gradient(135deg,#722ed1,#b37feb)}
.emp-avatar.cyan{background:linear-gradient(135deg,#13c2c2,#36cfc9)}

/* Section header */
.page-header{margin-bottom:20px}
.page-header h2{font-size:20px;font-weight:600;margin-bottom:4px}
.page-header p{font-size:14px;color:rgba(0,0,0,.45)}

/* Dept tree */
.dept-tree{font-size:14px}
.tree-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background .2s}
.tree-row:hover{background:#f5f5f5}
.tree-toggle{font-size:14px;color:#1677ff;cursor:pointer;width:20px;text-align:center;flex-shrink:0}
.tree-toggle:hover{color:#4096ff}
.tree-indent{display:inline-block;width:20px}
.tree-name{font-weight:500}
.tree-meta{font-size:12px;color:rgba(0,0,0,.45);margin-left:8px}

/* Search/filter bar */
.search-bar{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.search-input-wrap{display:flex;align-items:center;border:1px solid #d9d9d9;border-radius:6px;padding:0 12px;height:36px;background:#fff;min-width:240px}
.search-input-wrap input{border:none;outline:none;flex:1;background:transparent;font-size:14px}
.search-input-wrap .si-icon{color:rgba(0,0,0,.25);margin-right:8px}

/* Badge in menu */
.menu-badge{background:#ff4d4f;color:#fff;font-size:11px;padding:0 6px;border-radius:10px;line-height:18px;margin-left:8px}

/* Role preview in RBAC */
.role-preview{background:#001529;border-radius:8px;padding:16px;min-width:200px}
.role-preview-title{font-size:13px;color:rgba(255,255,255,.65);margin-bottom:12px;text-align:center}
.preview-menu-item{display:flex;align-items:center;padding:6px 12px;color:rgba(255,255,255,.65);font-size:13px;gap:8px;margin-bottom:4px}
.preview-menu-item.enabled{color:#fff}
.preview-menu-item.disabled{color:rgba(255,255,255,.25);text-decoration:line-through}
.pm-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.preview-menu-item.enabled .pm-dot{background:#52c41a}
.preview-menu-item.disabled .pm-dot{background:rgba(255,255,255,.15)}

/* Tab bar in orders */
.tabs-bar{display:flex;gap:0;border-bottom:1px solid #f0f0f0;margin-bottom:16px}
.tab-count{background:#f0f0f0;color:rgba(0,0,0,.45);font-size:11px;padding:0 6px;border-radius:10px;margin-left:4px}

/* Points card */
.points-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
.points-card{background:#fff;border-radius:8px;padding:20px;border:1px solid #f0f0f0;text-align:center}
.points-value{font-size:28px;font-weight:700;color:#fa8c16;margin-bottom:4px}
.points-label{font-size:13px;color:rgba(0,0,0,.45)}

/* ===== PAGE-SPECIFIC CSS FROM SOURCE FILES ===== */
${pageCSS(F['designer-9-rule-engine-visual.html'])}
${pageCSS(F['designer-11-order-deep.html'])}
${pageCSS(F['designer-15-platform-admin-full.html'])}
${pageCSS(F['designer-10-product-deep.html'])}

/* ===== H5 MOBILE STYLES ===== */
${css(F['designer-12-h5-login-home-checkin.html'])}
${css(F['designer-13-h5-points-mall-coupons.html'])}
${css(F['designer-14-h5-profile-badges-msg.html'])}
</style>
</head>
<body>

<!-- ============================================
     LOGIN PAGE
     ============================================ -->
<div id="login-page">
  <div class="page-nav">
    <div class="nav-brand">
      <div class="brand-dot"></div>
      碳积分打卡平台
    </div>
    <div class="nav-tab active" onclick="showLoginPage('page-enterprise')">企业管理员</div>
    <div class="nav-tab tab-blue" onclick="showLoginPage('page-platform')">平台管理员</div>
  </div>

  <!-- Enterprise Login -->
  <div id="page-enterprise" class="auth-page active bg-green">
    <div class="leaf" style="left:10%;top:80%;animation-duration:12s;animation-delay:0s">&#127811;</div>
    <div class="leaf" style="left:85%;top:90%;animation-duration:15s;animation-delay:3s">&#127807;</div>
    <div class="leaf" style="left:50%;top:95%;animation-duration:18s;animation-delay:6s">&#127808;</div>
    <div class="leaf" style="left:25%;top:85%;animation-duration:14s;animation-delay:2s">&#127810;</div>
    <div class="auth-card">
      <div class="card-header">
        <div class="card-logo logo-green">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="card-title">企业管理员登录</div>
        <div class="card-subtitle">碳积分打卡平台 · 企业管理后台</div>
      </div>
      <div class="form-group">
        <label class="form-label">手机号</label>
        <div class="form-input-wrap">
          <div class="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
          <input class="form-input" type="tel" placeholder="请输入手机号" id="ent-phone" value="13800138001">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <div class="form-input-wrap">
          <div class="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <input class="form-input" type="password" placeholder="请输入密码" id="ent-pwd" value="demo123">
          <div class="pwd-toggle" onclick="togglePwdGlobal('ent-pwd',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">验证码</label>
        <div class="captcha-row">
          <div class="form-input-wrap">
            <div class="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <input class="form-input" type="text" placeholder="请输入验证码" maxlength="4" id="ent-captcha">
          </div>
          <div class="captcha-canvas" onclick="refreshCaptcha()">
            <div class="captcha-inner">
              <span class="captcha-char">7</span><span class="captcha-char">K</span><span class="captcha-char">3</span><span class="captcha-char">R</span>
              <div class="captcha-noise"></div><div class="captcha-line"></div><div class="captcha-refresh">换一张</div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;justify-content:space-between">
        <label class="form-checkbox checked" id="ent-remember" onclick="toggleCheckGlobal('ent-remember')">
          <div class="checkbox-box"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></div>
          记住我
        </label>
        <a class="form-link">忘记密码？</a>
      </div>
      <button class="btn btn-green" onclick="doLogin('enterprise')">登 录</button>
      <div class="form-footer" style="justify-content:center;margin-top:16px">
        <span style="font-size:12px;color:rgba(0,0,0,.25)">登录即同意 <a style="color:#52c41a">《用户服务协议》</a> 和 <a style="color:#52c41a">《隐私政策》</a></span>
      </div>
    </div>
  </div>

  <!-- Platform Login -->
  <div id="page-platform" class="auth-page bg-blue">
    <div class="auth-card">
      <div class="card-header">
        <div class="card-logo logo-blue">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div class="card-title">平台管理员登录</div>
        <div class="card-subtitle">碳积分打卡平台 · 平台运营中心</div>
      </div>
      <div class="security-banner info">
        <div class="security-banner-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <div>安全提醒：平台管理员账号仅限授权人员使用，所有操作将被记录审计。</div>
      </div>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <div class="form-input-wrap">
          <div class="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <input class="form-input" type="text" placeholder="请输入用户名" id="plat-user" value="admin">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <div class="form-input-wrap">
          <div class="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <input class="form-input" type="password" placeholder="请输入密码" id="plat-pwd" value="admin123">
          <div class="pwd-toggle" onclick="togglePwdGlobal('plat-pwd',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">验证码</label>
        <div class="captcha-row">
          <div class="form-input-wrap">
            <div class="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <input class="form-input" type="text" placeholder="请输入验证码" maxlength="4" id="plat-captcha">
          </div>
          <div class="captcha-canvas" onclick="refreshCaptcha()">
            <div class="captcha-inner">
              <span class="captcha-char">5</span><span class="captcha-char">M</span><span class="captcha-char">9</span><span class="captcha-char">D</span>
              <div class="captcha-noise"></div><div class="captcha-line"></div><div class="captcha-refresh">换一张</div>
            </div>
          </div>
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;justify-content:space-between">
        <label class="form-checkbox blue checked" id="plat-remember" onclick="toggleCheckGlobal('plat-remember')">
          <div class="checkbox-box"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></div>
          记住我
        </label>
        <a class="form-link blue">忘记密码？</a>
      </div>
      <button class="btn btn-blue" onclick="doLogin('platform')">登 录</button>
      <div class="form-footer" style="justify-content:center;margin-top:16px">
        <span style="font-size:12px;color:rgba(0,0,0,.25)">登录即同意 <a style="color:#1677ff">《平台运营协议》</a> 和 <a style="color:#1677ff">《安全管理制度》</a></span>
      </div>
    </div>
  </div>
</div>

<!-- ============================================
     ENTERPRISE ADMIN DASHBOARD
     ============================================ -->
<div id="app-enterprise">
  <div class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">C</div>
      <span>碳积分 · 企业后台</span>
    </div>
    <div class="sidebar-menu">
      <div class="menu-section">概览</div>
      <div class="menu-item active" onclick="switchEntPage('ent-dashboard',this)"><span class="menu-icon">&#128202;</span><span class="menu-label">工作台</span></div>
      <div class="menu-section">企业管理</div>
      <div class="menu-item" onclick="switchEntPage('ent-employees',this)"><span class="menu-icon">&#128101;</span><span class="menu-label">员工管理</span></div>
      <div class="menu-item" onclick="switchEntPage('ent-departments',this)"><span class="menu-icon">&#127970;</span><span class="menu-label">部门管理</span></div>
      <div class="menu-item" onclick="switchEntPage('ent-rbac',this)"><span class="menu-icon">&#128737;</span><span class="menu-label">角色权限</span></div>
      <div class="menu-section">运营管理</div>
      <div class="menu-item" onclick="switchEntPage('ent-rules',this)"><span class="menu-icon">&#9881;</span><span class="menu-label">规则配置</span></div>
      <div class="menu-item" onclick="switchEntPage('ent-products',this)"><span class="menu-icon">&#127873;</span><span class="menu-label">商品管理</span></div>
      <div class="menu-item" onclick="switchEntPage('ent-orders',this)"><span class="menu-icon">&#128230;</span><span class="menu-label">订单管理</span></div>
      <div class="menu-item" onclick="switchEntPage('ent-points',this)"><span class="menu-icon">&#128176;</span><span class="menu-label">积分运营</span></div>
      <div class="menu-item" onclick="switchEntPage('ent-reports',this)"><span class="menu-icon">&#128200;</span><span class="menu-label">数据报表</span></div>
    </div>
    <div class="sidebar-footer">
      <div class="menu-item" onclick="showH5Preview()" style="color:#52c41a;padding:8px 12px;height:auto"><span class="menu-icon">&#128241;</span><span class="menu-label">预览H5移动端</span></div>
    </div>
  </div>

  <div class="header-bar">
    <div class="header-left">
      <div class="breadcrumb">
        <span>首页</span><span class="bc-sep">/</span><span class="bc-current" id="ent-bc">工作台</span>
      </div>
    </div>
    <div class="header-right">
      <div class="header-action" title="通知">&#128276;</div>
      <div class="user-info" onclick="doLogout()">
        <div class="user-avatar">管</div>
        <span class="user-name">企业管理员</span>
        <span class="user-role">绿源科技</span>
      </div>
    </div>
  </div>

  <div class="main-content">
    <div class="page-container active" id="ent-dashboard">
      ${page(F['designer-1-enterprise-core.html'], 'page-dashboard')}
    </div>
    <div class="page-container" id="ent-employees">
      ${page(F['designer-6-employee-deep.html'], 'page-employee-list')}
    </div>
    <div class="page-container" id="ent-departments">
      ${page(F['designer-7-department-team.html'], 'page-dept')}
    </div>
    <div class="page-container" id="ent-rbac">
      ${page(F['designer-8-rbac-deep.html'], 'pageRoleList')}
    </div>
    <div class="page-container" id="ent-rules">
      ${between(F['designer-9-rule-engine-visual.html'], /<main class="main-content">/, /<\/main>/)}
    </div>
    <div class="page-container" id="ent-products">
      ${between(F['designer-10-product-deep.html'], /<div class="content"[^>]*id="mainContent">/, /<script/)}
    </div>
    <div class="page-container" id="ent-orders">
      ${between(F['designer-11-order-deep.html'], /<div class="content">/, /<\/div>\s*<\/div>\s*<script/)}
    </div>
    <div class="page-container" id="ent-points">
      ${page(F['designer-2-enterprise-operations.html'], 'page-points')}
    </div>
    <div class="page-container" id="ent-reports">
      ${page(F['designer-2-enterprise-operations.html'], 'page-reports')}
    </div>
  </div>
</div>

<!-- ============================================
     PLATFORM ADMIN DASHBOARD
     ============================================ -->
<div id="app-platform">
  <div class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon purple">C</div>
      <span>碳积分 · 平台管理</span>
    </div>
    <div class="sidebar-menu">
      <div class="menu-section">概览</div>
      <div class="menu-item active" onclick="switchPltPage('plt-dashboard',this)"><span class="menu-icon">&#128202;</span><span class="menu-label">全平台看板</span></div>
      <div class="menu-section">运营管理</div>
      <div class="menu-item" onclick="switchPltPage('plt-tenants',this)"><span class="menu-icon">&#127970;</span><span class="menu-label">企业管理</span></div>
      <div class="menu-item" onclick="switchPltPage('plt-config',this)"><span class="menu-icon">&#9881;</span><span class="menu-label">平台配置</span></div>
      <div class="menu-section">系统管理</div>
      <div class="menu-item" onclick="switchPltPage('plt-admins',this)"><span class="menu-icon">&#128100;</span><span class="menu-label">管理员管理</span></div>
      <div class="menu-item" onclick="switchPltPage('plt-logs',this)"><span class="menu-icon">&#128220;</span><span class="menu-label">操作日志</span></div>
      <div class="menu-item" onclick="switchPltPage('plt-security',this)"><span class="menu-icon">&#128274;</span><span class="menu-label">安全配置</span></div>
    </div>
    <div class="sidebar-footer">
      <div class="menu-item" onclick="showH5Preview()" style="color:#52c41a;padding:8px 12px;height:auto"><span class="menu-icon">&#128241;</span><span class="menu-label">预览H5移动端</span></div>
    </div>
  </div>

  <div class="header-bar">
    <div class="header-left">
      <div class="breadcrumb">
        <span>首页</span><span class="bc-sep">/</span><span class="bc-current" id="plt-bc">全平台看板</span>
      </div>
    </div>
    <div class="header-right">
      <div class="header-action" title="通知">&#128276;</div>
      <div class="user-info" onclick="doLogout()">
        <div class="user-avatar purple">超</div>
        <span class="user-name">超级管理员</span>
        <span class="user-role">平台</span>
      </div>
    </div>
  </div>

  <div class="main-content">
    <div class="page-container active" id="plt-dashboard">${page(F['designer-15-platform-admin-full.html'], 'page-dashboard')}</div>
    <div class="page-container" id="plt-tenants">${page(F['designer-15-platform-admin-full.html'], 'page-tenants')}</div>
    <div class="page-container" id="plt-config">${page(F['designer-15-platform-admin-full.html'], 'page-config')}</div>
    <div class="page-container" id="plt-admins">${page(F['designer-15-platform-admin-full.html'], 'page-admins')}</div>
    <div class="page-container" id="plt-logs">${page(F['designer-15-platform-admin-full.html'], 'page-logs')}</div>
    <div class="page-container" id="plt-security">${page(F['designer-15-platform-admin-full.html'], 'page-security')}</div>
  </div>
</div>

<!-- ============================================
     H5 MOBILE PREVIEW
     ============================================ -->
<div id="h5-modal" class="h5-modal">
  <div class="h5-modal-content">
    <div class="h5-modal-header">
      <span>H5 移动端预览</span>
      <div class="h5-modal-close" onclick="closeH5Preview()">&#10005;</div>
    </div>
    <div class="h5-tabs">
      <div class="h5-tab active" onclick="switchH5Tab(0,this)">首页/打卡</div>
      <div class="h5-tab" onclick="switchH5Tab(1,this)">积分/商城</div>
      <div class="h5-tab" onclick="switchH5Tab(2,this)">个人中心</div>
    </div>
    <div class="h5-frame-container">
      <div class="h5-page active" id="h5-page-0">
        ${between(F['designer-12-h5-login-home-checkin.html'], /<div class="phone-screen">/, /<\/div>\s*<\/div>\s*<script/)}
      </div>
      <div class="h5-page" id="h5-page-1">
        ${between(F['designer-13-h5-points-mall-coupons.html'], /<div class="screen-area">/, /<\/div>\s*<\/div>\s*<script/)}
      </div>
      <div class="h5-page" id="h5-page-2">
        ${between(F['designer-14-h5-profile-badges-msg.html'], /<div class="phone-frame">/, /<\/div>\s*<script/)}
      </div>
    </div>
  </div>
</div>

<!-- ============================================
     JAVASCRIPT
     ============================================ -->
<script>
// ===== UNIFIED NAVIGATION =====

function showLoginPage(pageId) {
  document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tabs = document.querySelectorAll('.nav-tab');
  if (pageId === 'page-enterprise') tabs[0].classList.add('active');
  else if (pageId === 'page-platform') tabs[1].classList.add('active');
}

function togglePwdGlobal(id, el) {
  var input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleCheckGlobal(id) {
  document.getElementById(id).classList.toggle('checked');
}

function refreshCaptcha() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  document.querySelectorAll('.captcha-char').forEach(function(el) {
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
  });
}

function doLogin(type) {
  document.getElementById('login-page').style.display = 'none';
  if (type === 'enterprise') {
    document.getElementById('app-enterprise').style.display = 'flex';
  } else {
    document.getElementById('app-platform').style.display = 'flex';
  }
}

function doLogout() {
  document.getElementById('app-enterprise').style.display = 'none';
  document.getElementById('app-platform').style.display = 'none';
  document.getElementById('login-page').style.display = '';
  showLoginPage('page-enterprise');
}

// Enterprise navigation
var entPageNames = {
  'ent-dashboard': '工作台', 'ent-employees': '员工管理', 'ent-departments': '部门管理',
  'ent-rbac': '角色权限', 'ent-rules': '规则配置', 'ent-products': '商品管理',
  'ent-orders': '订单管理', 'ent-points': '积分运营', 'ent-reports': '数据报表'
};

function switchEntPage(pageId, el) {
  document.querySelectorAll('#app-enterprise .page-container').forEach(function(p) { p.classList.remove('active'); });
  var page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll('#app-enterprise .menu-item').forEach(function(m) { m.classList.remove('active'); });
  if (el) el.classList.add('active');
  var bc = document.getElementById('ent-bc');
  if (bc) bc.textContent = entPageNames[pageId] || pageId;
}

// Platform navigation
var pltPageNames = {
  'plt-dashboard': '全平台看板', 'plt-tenants': '企业管理', 'plt-config': '平台配置',
  'plt-admins': '管理员管理', 'plt-logs': '操作日志', 'plt-security': '安全配置'
};

function switchPltPage(pageId, el) {
  document.querySelectorAll('#app-platform .page-container').forEach(function(p) { p.classList.remove('active'); });
  var page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll('#app-platform .menu-item').forEach(function(m) { m.classList.remove('active'); });
  if (el) el.classList.add('active');
  var bc = document.getElementById('plt-bc');
  if (bc) bc.textContent = pltPageNames[pageId] || pageId;
}

// H5 Preview
function showH5Preview() { document.getElementById('h5-modal').classList.add('active'); }
function closeH5Preview() { document.getElementById('h5-modal').classList.remove('active'); }
function switchH5Tab(idx, el) {
  document.querySelectorAll('.h5-page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('h5-page-' + idx).classList.add('active');
  document.querySelectorAll('.h5-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
}

// Close modal on backdrop click
document.getElementById('h5-modal').addEventListener('click', function(e) {
  if (e.target === this) closeH5Preview();
});

// Page-switching compatibility: make page IDs work with original JS
function switchPage(id) {
  var page = document.getElementById(id);
  if (page) { page.classList.add('active'); }
}

// ===== ORIGINAL PAGE JS =====

${js(F['designer-15-platform-admin-full.html'])}
${js(F['designer-9-rule-engine-visual.html'])}
${js(F['designer-11-order-deep.html'])}
${js(F['designer-10-product-deep.html'])}
${js(F['designer-12-h5-login-home-checkin.html'])}
${js(F['designer-13-h5-points-mall-coupons.html'])}
${js(F['designer-14-h5-profile-badges-msg.html'])}
</script>

</body>
</html>`;

const outputPath = path.join(DIR, 'unified-saas-platform.html');
fs.writeFileSync(outputPath, output, 'utf-8');
console.log('Done!');
console.log('Output: ' + outputPath);
console.log('Size: ' + (Buffer.byteLength(output) / 1024).toFixed(0) + ' KB');
console.log('Lines: ' + output.split('\n').length);
