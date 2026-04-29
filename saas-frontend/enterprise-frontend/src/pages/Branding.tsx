import React, { useState, useEffect } from 'react';
import { Upload, Button, ColorPicker, message, Tooltip } from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleFilled,
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  ShopOutlined,
  BarChartOutlined,
  SafetyOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UploadProps } from 'antd';
import type { Color } from 'antd/es/color-picker';

import {
  getCurrentBranding,
  updateBranding,
  uploadLogo,
  deleteLogo,
  TenantBranding,
  UpdateBrandingRequest,
} from '@/api/branding';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

const PRESET_THEMES = [
  {
    value: 'default-blue',
    label: '深海蓝',
    sublabel: 'Deep Ocean',
    primary: '#1890ff',
    secondary: '#40a9ff',
    gradient: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
  },
  {
    value: 'tech-green',
    label: '森林绿',
    sublabel: 'Forest',
    primary: '#52c41a',
    secondary: '#73d13d',
    gradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
  },
  {
    value: 'vibrant-orange',
    label: '日落橙',
    sublabel: 'Sunset',
    primary: '#fa8c16',
    secondary: '#ffa940',
    gradient: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)',
  },
  {
    value: 'deep-purple',
    label: '星云紫',
    sublabel: 'Nebula',
    primary: '#722ed1',
    secondary: '#9254de',
    gradient: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
  },
];

const MINI_MENU_ITEMS = [
  { icon: <DashboardOutlined />, label: '数据看板' },
  { icon: <TeamOutlined />, label: '员工管理' },
  { icon: <SettingOutlined />, label: '规则配置', active: true },
  { icon: <ShopOutlined />, label: '商品管理' },
  { icon: <TrophyOutlined />, label: '积分运营' },
  { icon: <BarChartOutlined />, label: '数据报表' },
  { icon: <SafetyOutlined />, label: '角色权限' },
];

const Branding: React.FC = () => {
  const queryClient = useQueryClient();
  const { primaryColor: liveColor } = useBranding();

  const [logoUrl, setLogoUrl] = useState<string>('');
  const [themeType, setThemeType] = useState<'preset' | 'custom'>('preset');
  const [presetTheme, setPresetTheme] = useState<string>('default-blue');
  const [primaryColor, setPrimaryColor] = useState<string>('#1890ff');
  const [secondaryColor, setSecondaryColor] = useState<string>('#40a9ff');

  const { data: branding, isLoading } = useQuery<TenantBranding>({
    queryKey: ['tenantBranding'],
    queryFn: getCurrentBranding,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBrandingRequest) => updateBranding(data),
    onSuccess: () => {
      message.success('品牌配置已更新');
      queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
    },
    onError: () => {
      message.error('更新失败，请稍后重试');
    },
  });

  const uploadMutation = useMutation<{ url: string }, Error, File>({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: (res) => {
      setLogoUrl(res.url);
      queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
      message.success('Logo 上传成功');
    },
    onError: () => {
      message.error('Logo 上传失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLogo,
    onSuccess: () => {
      setLogoUrl('');
      queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
      message.success('Logo 已删除');
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  useEffect(() => {
    if (branding) {
      setLogoUrl(branding.logoUrl || '');
      setThemeType(branding.themeType);
      setPresetTheme(branding.presetTheme || 'default-blue');
      setPrimaryColor(branding.primaryColor || '#1890ff');
      setSecondaryColor(branding.secondaryColor || '#40a9ff');
    }
  }, [branding]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片格式文件');
      return false;
    }
    if (file.size / 1024 > 500) {
      message.error('图片不能超过 500KB');
      return false;
    }
    uploadMutation.mutate(file);
    return false;
  };

  const handleSave = () => {
    const data: UpdateBrandingRequest = { themeType };
    if (themeType === 'preset') {
      data.presetTheme = presetTheme as any;
    } else {
      data.primaryColor = primaryColor;
      data.secondaryColor = secondaryColor;
    }
    updateMutation.mutate(data);
  };

  const previewPrimary = themeType === 'preset'
    ? (PRESET_THEMES.find(t => t.value === presetTheme)?.primary || '#1890ff')
    : primaryColor;
  const previewSecondary = themeType === 'preset'
    ? (PRESET_THEMES.find(t => t.value === presetTheme)?.secondary || '#40a9ff')
    : secondaryColor;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #eee', borderTopColor: liveColor, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---------- Light-theme color tokens ----------
  const t = {
    textHeading: '#2c2825',
    textMuted: '#8a857f',
    bgSoft: '#faf8f5',
    warmBorder: '#d4d0c8',
  };

  // ---------- STYLES ----------
  const s = {
    page: {
      fontFamily: "'DM Sans', sans-serif",
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 0,
      minHeight: 'calc(100vh - 160px)',
    } as React.CSSProperties,

    leftPanel: {
      padding: '48px 40px',
      overflowY: 'auto' as const,
      maxHeight: 'calc(100vh - 160px)',
      borderRight: `1px solid ${t.warmBorder}`,
    } as React.CSSProperties,

    rightPanel: {
      padding: '48px 40px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const,
    } as React.CSSProperties,

    sectionLabel: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '1.5px',
      textTransform: 'uppercase' as const,
      color: t.textMuted,
      marginBottom: 16,
    } as React.CSSProperties,

    heading: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: 28,
      fontWeight: 700,
      color: t.textHeading,
      marginBottom: 4,
    } as React.CSSProperties,

    subheading: {
      fontSize: 14,
      color: t.textMuted,
      marginBottom: 40,
    } as React.CSSProperties,

    section: {
      marginBottom: 40,
    } as React.CSSProperties,

    logoFrame: {
      width: '100%',
      height: 120,
      border: `2px dashed ${t.warmBorder}`,
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
      overflow: 'hidden',
    } as React.CSSProperties,

    swatchGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
    } as React.CSSProperties,

    swatch: (isActive: boolean, gradient: string) => ({
      borderRadius: 16,
      overflow: 'hidden',
      cursor: 'pointer',
      border: isActive ? `3px solid ${t.textHeading}` : '3px solid transparent',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isActive ? 'scale(1.02)' : 'scale(1)',
      boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
    } as React.CSSProperties),

    swatchColor: (gradient: string) => ({
      height: 80,
      background: gradient,
      position: 'relative',
    } as React.CSSProperties),

    swatchInfo: {
      padding: '12px 14px',
      background: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 -1px 4px rgba(0,0,0,0.04)',
    } as React.CSSProperties,

    saveBar: {
      position: 'sticky' as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: '20px 0',
      display: 'flex',
      gap: 12,
      zIndex: 10,
      background: t.bgSoft,
    } as React.CSSProperties,

    // Mini preview styles
    miniFrame: {
      width: 340,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      background: '#fff',
    } as React.CSSProperties,

    miniTitlebar: {
      height: 28,
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      gap: 5,
    } as React.CSSProperties,

    miniDot: (color: string) => ({
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
    } as React.CSSProperties),

    miniBody: {
      display: 'flex',
      height: 260,
    } as React.CSSProperties,

    miniSidebar: (color: string) => ({
      width: 100,
      background: color,
      color: 'rgba(255,255,255,0.9)',
      padding: '8px 0',
      fontSize: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    } as React.CSSProperties),

    miniSidebarItem: (active: boolean) => ({
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
      fontWeight: active ? 600 : 400,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    } as React.CSSProperties),

    miniContent: {
      flex: 1,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      background: '#fafafa',
    } as React.CSSProperties,

    miniHeader: (color: string) => ({
      height: 24,
      borderRadius: 4,
      background: '#fff',
      borderBottom: `2px solid ${color}`,
      marginBottom: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: 8,
    } as React.CSSProperties),

    miniAvatar: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#e8e8e8',
    } as React.CSSProperties,

    miniCard: {
      borderRadius: 6,
      border: `1px solid ${t.warmBorder}`,
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: '#fff',
    } as React.CSSProperties,

    miniStatRow: {
      display: 'flex',
      gap: 8,
    } as React.CSSProperties,

    miniStatBox: (color: string) => ({
      flex: 1,
      height: 36,
      borderRadius: 4,
      background: `${color}15`,
      border: `1px solid ${color}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 7,
      color,
      fontWeight: 600,
    } as React.CSSProperties),

    miniButton: (color: string, filled: boolean) => ({
      height: 20,
      borderRadius: 4,
      background: filled ? color : '#fff',
      border: `1px solid ${color}40`,
      color: filled ? '#fff' : color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 7,
      fontWeight: 600,
      flex: 1,
    } as React.CSSProperties),

    modeToggle: {
      display: 'flex',
      background: t.bgSoft,
      borderRadius: 10,
      padding: 3,
      marginBottom: 20,
      border: `1px solid ${t.warmBorder}`,
    } as React.CSSProperties,

    modeBtn: (active: boolean) => ({
      flex: 1,
      padding: '8px 0',
      borderRadius: 8,
      border: 'none',
      background: active ? '#fff' : 'transparent',
      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      fontWeight: active ? 600 : 400,
      color: active ? t.textHeading : t.textMuted,
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      fontSize: 13,
    } as React.CSSProperties),

    customColorRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    } as React.CSSProperties,

    colorLabel: {
      fontSize: 13,
      fontWeight: 500,
      color: t.textMuted,
      width: 60,
    } as React.CSSProperties,

    colorStrip: (color: string) => ({
      flex: 1,
      height: 44,
      borderRadius: 10,
      background: color,
      transition: 'background-color 0.3s ease',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
    } as React.CSSProperties),

    previewLabel: {
      textAlign: 'center',
      fontSize: 11,
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: t.textMuted,
      marginBottom: 20,
      fontWeight: 600,
    } as React.CSSProperties,

    logoImg: {
      maxWidth: '80%',
      maxHeight: 80,
      objectFit: 'contain',
    } as React.CSSProperties,
  };

  return (
    <div className="branding-page" style={s.page}>
      {/* ===== LEFT: Configuration ===== */}
      <div style={s.leftPanel}>
        <h1 className="branding-heading" style={s.heading}>品牌工作室</h1>
        <p style={s.subheading}>定制企业专属的视觉标识</p>

        {/* --- LOGO --- */}
        <div style={s.section}>
          <div style={s.sectionLabel}>企业 Logo</div>

          {logoUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{
                width: 160, height: 80, borderRadius: 12,
                border: `1px solid ${t.warmBorder}`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#fff', padding: 12,
              }}>
                <img src={logoUrl} alt="Logo" style={s.logoImg} />
              </div>
              <Tooltip title="删除 Logo">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteMutation.mutate()}
                  loading={deleteMutation.isPending}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
            </div>
          ) : null}

          <Upload
            beforeUpload={beforeUpload}
            showUploadList={false}
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          >
            <div className="branding-upload-zone" style={{
              ...s.logoFrame,
              borderColor: logoUrl ? t.warmBorder : t.warmBorder,
            }}>
              {uploadMutation.isPending ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>上传中...</div>
              ) : (
                <>
                  <UploadOutlined style={{ fontSize: 20, color: t.textMuted }} />
                  <span style={{ fontSize: 12, color: t.textMuted }}>
                    点击上传 · PNG / JPG / SVG · ≤ 500KB
                  </span>
                </>
              )}
            </div>
          </Upload>
        </div>

        {/* --- THEME --- */}
        <div style={s.section}>
          <div style={s.sectionLabel}>界面主题</div>

          {/* Mode Toggle */}
          <div style={s.modeToggle}>
            <button
              style={s.modeBtn(themeType === 'preset')}
              onClick={() => setThemeType('preset')}
            >
              预设主题
            </button>
            <button
              style={s.modeBtn(themeType === 'custom')}
              onClick={() => setThemeType('custom')}
            >
              自定义
            </button>
          </div>

          {themeType === 'preset' ? (
            <div style={s.swatchGrid}>
              {PRESET_THEMES.map((theme) => {
                const active = presetTheme === theme.value;
                return (
                  <div
                    key={theme.value}
                    className={`branding-swatch ${active ? 'branding-swatch-active' : ''}`}
                    style={s.swatch(active, theme.gradient)}
                    onClick={() => {
                      setPresetTheme(theme.value);
                      setPrimaryColor(theme.primary);
                      setSecondaryColor(theme.secondary);
                    }}
                  >
                    <div style={s.swatchColor(theme.gradient)}>
                      {active && (
                        <div style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'rgba(255,255,255,0.95)',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <CheckCircleFilled style={{ color: theme.primary, fontSize: 18 }} />
                        </div>
                      )}
                    </div>
                    <div style={s.swatchInfo}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: t.textHeading }}>
                          {theme.label}
                        </div>
                        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>
                          {theme.sublabel}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: theme.primary }} />
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: theme.secondary }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div style={s.customColorRow}>
                <span style={s.colorLabel}>主色</span>
                <ColorPicker
                  value={primaryColor}
                  onChange={(_: Color, hex: string) => setPrimaryColor(hex)}
                  size="large"
                />
                <div className="branding-color-strip" style={s.colorStrip(primaryColor)} />
              </div>
              <div style={s.customColorRow}>
                <span style={s.colorLabel}>辅助色</span>
                <ColorPicker
                  value={secondaryColor}
                  onChange={(_: Color, hex: string) => setSecondaryColor(hex)}
                  size="large"
                />
                <div className="branding-color-strip" style={s.colorStrip(secondaryColor)} />
              </div>
            </div>
          )}
        </div>

        {/* --- SAVE --- */}
        <div style={s.saveBar}>
          <Button
            className="branding-save-btn"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={updateMutation.isPending}
            size="large"
            style={{
              height: 48,
              borderRadius: 10,
              paddingInline: 32,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            保存配置
          </Button>
        </div>
      </div>

      {/* ===== RIGHT: Live Preview ===== */}
      <div className="branding-preview-panel" style={s.rightPanel}>
        <div style={s.previewLabel}>实时预览</div>

        <div style={s.miniFrame}>
          {/* Title Bar */}
          <div style={s.miniTitlebar}>
            <div style={s.miniDot('#ff5f57')} />
            <div style={s.miniDot('#febc2e')} />
            <div style={s.miniDot('#28c840')} />
          </div>

          {/* Body */}
          <div style={s.miniBody}>
            {/* Sidebar */}
            <div style={s.miniSidebar(previewPrimary)}>
              {/* Logo area */}
              <div style={{
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 10,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 4,
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: 2 }} />
                ) : (
                  <span>管</span>
                )}
              </div>

              {MINI_MENU_ITEMS.map((item, i) => (
                <div key={i} style={s.miniSidebarItem(!!item.active)}>
                  <span style={{ fontSize: 8 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={s.miniContent}>
              {/* Header */}
              <div style={s.miniHeader(previewPrimary)}>
                <div style={s.miniAvatar} />
              </div>

              {/* Stats Row */}
              <div style={s.miniStatRow}>
                <div style={s.miniStatBox(previewPrimary)}>42 人</div>
                <div style={s.miniStatBox(previewSecondary)}>1,280</div>
                <div style={s.miniStatBox(previewPrimary)}>96%</div>
              </div>

              {/* Card */}
              <div style={s.miniCard}>
                <div style={{ fontSize: 8, fontWeight: 600, color: t.textHeading }}>最近活动</div>
                <div style={{ height: 4, borderRadius: 2, background: '#e8e6e2', width: '100%' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 2,
                    width: '65%',
                    background: previewPrimary,
                    transition: 'background 0.3s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      flex: 1,
                      height: 28,
                      borderRadius: 3,
                      background: i <= 3 ? previewPrimary : '#e8e6e2',
                      opacity: i <= 3 ? 0.2 + i * 0.2 : 1,
                      transition: 'background 0.3s ease',
                    }} />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <div style={s.miniButton(previewPrimary, true)}>主要操作</div>
                <div style={s.miniButton(previewSecondary, false)}>次要操作</div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme name under preview */}
        <div style={{
          marginTop: 20,
          fontSize: 13,
          color: t.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: 3,
            background: previewPrimary,
            transition: 'background 0.3s ease',
          }} />
          {themeType === 'preset'
            ? PRESET_THEMES.find(t => t.value === presetTheme)?.label
            : '自定义主题'}
        </div>
      </div>
    </div>
  );
};

export default Branding;
