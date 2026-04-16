import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Upload,
  Button,
  Radio,
  ColorPicker,
  message,
  Space,
  Typography,
  Divider,
  Image,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
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

const { Title, Text } = Typography;
const { Group: RadioGroup } = Radio;

// Preset theme options
const PRESET_THEMES = [
  { value: 'default-blue', label: '默认蓝', primary: '#1890ff', secondary: '#40a9ff' },
  { value: 'tech-green', label: '科技绿', primary: '#52c41a', secondary: '#73d13d' },
  { value: 'vibrant-orange', label: '活力橙', primary: '#fa8c16', secondary: '#ffa940' },
  { value: 'deep-purple', label: '深邃紫', primary: '#722ed1', secondary: '#9254de' },
];

const Branding: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [themeType, setThemeType] = useState<'preset' | 'custom'>('preset');
  const [presetTheme, setPresetTheme] = useState<string>('default-blue');
  const [primaryColor, setPrimaryColor] = useState<string>('#1890ff');
  const [secondaryColor, setSecondaryColor] = useState<string>('#40a9ff');

    // Fetch current branding configuration
    const { data: branding, isLoading } = useQuery<TenantBranding>({
        queryKey: ['tenantBranding'],
        queryFn: getCurrentBranding,
    });

  // Update branding mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateBrandingRequest) => updateBranding(data),
    onSuccess: () => {
      message.success('品牌配置更新成功');
      queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
    },
    onError: () => {
      message.error('品牌配置更新失败，请稍后重试');
    },
  });

    // Upload logo mutation
    const uploadMutation = useMutation<{ url: string }, Error, File>({
        mutationFn: (file: File) => uploadLogo(file),
        onSuccess: (res) => {
            setLogoUrl(res.url);
            message.success('Logo 上传成功');
        },
        onError: () => {
            message.error('Logo 上传失败，请检查文件格式和大小');
        },
    });

  // Delete logo mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLogo,
    onSuccess: () => {
      setLogoUrl('');
      message.success('Logo 删除成功');
    },
    onError: () => {
      message.error('Logo 删除失败，请稍后重试');
    },
  });

  // Initialize form with branding data
  useEffect(() => {
    if (branding) {
      setLogoUrl(branding.logoUrl || '');
      setThemeType(branding.themeType);
      setPresetTheme(branding.presetTheme || 'default-blue');
      setPrimaryColor(branding.primaryColor || '#1890ff');
      setSecondaryColor(branding.secondaryColor || '#40a9ff');
      
      form.setFieldsValue({
        themeType: branding.themeType,
        presetTheme: branding.presetTheme,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      });
    }
  }, [branding, form]);

  // Upload before check
  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('请上传图片格式的文件');
      return false;
    }
    const isLt500K = file.size / 1024 < 500;
    if (!isLt500K) {
      message.error('图片大小不能超过 500KB');
      return false;
    }
    uploadMutation.mutate(file);
    return false; // Prevent auto upload
  };

  // Handle save
  const handleSave = () => {
    const updateData: UpdateBrandingRequest = {
      themeType,
    };
    if (themeType === 'preset') {
      updateData.presetTheme = presetTheme as any;
    } else {
      updateData.primaryColor = primaryColor;
      updateData.secondaryColor = secondaryColor;
    }
    updateMutation.mutate(updateData);
  };

  // Handle theme type change
  const handleThemeTypeChange = (e: any) => {
    setThemeType(e.target.value);
  };

  // Handle preset theme change
  const handlePresetThemeChange = (e: any) => {
    setPresetTheme(e.target.value);
    const theme = PRESET_THEMES.find(t => t.value === e.target.value);
    if (theme) {
      setPrimaryColor(theme.primary);
      setSecondaryColor(theme.secondary);
    }
  };

  // Handle primary color change
  const handlePrimaryColorChange = (_color: Color, hex: string) => {
    setPrimaryColor(hex);
  };

  // Handle secondary color change
  const handleSecondaryColorChange = (_color: Color, hex: string) => {
    setSecondaryColor(hex);
  };

  // Handle delete logo
  const handleDeleteLogo = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Title level={3}>品牌配置</Title>
      <Text type="secondary">配置企业专属的 Logo 和界面主题，展示企业品牌形象</Text>
      <Divider />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Logo Configuration */}
        <Card title="企业 Logo" bordered={false}>
          <Form layout="vertical">
            <Form.Item label="当前 Logo">
              {logoUrl ? (
                <Space direction="vertical">
                  <Image
                    width={200}
                    src={logoUrl}
                    alt="企业 Logo"
                    fallback="https://via.placeholder.com/200x60?text=企业+Logo"
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteLogo}
                    loading={deleteMutation.isPending}
                  >
                    删除 Logo
                  </Button>
                </Space>
              ) : (
                <div style={{
                  width: 200,
                  height: 60,
                  border: '2px dashed #d9d9d9',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                }}>
                  暂未上传 Logo
                </div>
              )}
            </Form.Item>
            <Form.Item label="上传 Logo">
              <Upload
                name="logo"
                listType="picture"
                beforeUpload={beforeUpload}
                showUploadList={false}
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              >
                <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
                  点击上传
                </Button>
              </Upload>
              <Text type="secondary" style={{ marginLeft: 16 }}>
                支持 PNG、JPG、SVG 格式，建议尺寸 200x60px，大小不超过 500KB
              </Text>
            </Form.Item>
          </Form>
        </Card>

        {/* Theme Configuration */}
        <Card title="界面主题" bordered={false}>
          <Form form={form} layout="vertical">
            <Form.Item name="themeType" label="主题类型">
              <RadioGroup value={themeType} onChange={handleThemeTypeChange}>
                <Radio value="preset">预设主题</Radio>
                <Radio value="custom">自定义主题</Radio>
              </RadioGroup>
            </Form.Item>

            {themeType === 'preset' && (
              <Form.Item name="presetTheme" label="选择预设主题">
                <RadioGroup
                  value={presetTheme}
                  onChange={handlePresetThemeChange}
                  style={{ width: '100%' }}
                >
                  <Space wrap size="large">
                    {PRESET_THEMES.map(theme => (
                      <Radio key={theme.value} value={theme.value}>
                        <Space>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: theme.primary,
                            display: 'inline-block',
                            verticalAlign: 'middle',
                          }} />
                          {theme.label}
                        </Space>
                      </Radio>
                    ))}
                  </Space>
                </RadioGroup>
              </Form.Item>
            )}

            {themeType === 'custom' && (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Form.Item label="自定义主色">
                  <Space>
                    <ColorPicker
                      value={primaryColor}
                      onChange={handlePrimaryColorChange}
                      showText
                      size="large"
                    />
                    <div style={{
                      width: 100,
                      height: 40,
                      borderRadius: 6,
                      background: primaryColor,
                    }} />
                  </Space>
                </Form.Item>
                <Form.Item label="自定义辅助色">
                  <Space>
                    <ColorPicker
                      value={secondaryColor}
                      onChange={handleSecondaryColorChange}
                      showText
                      size="large"
                    />
                    <div style={{
                      width: 100,
                      height: 40,
                      borderRadius: 6,
                      background: secondaryColor,
                    }} />
                  </Space>
                </Form.Item>
              </Space>
            )}

            {/* Theme Preview */}
            <Card title="主题预览" size="small" style={{ marginTop: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Button type="primary" style={{ background: primaryColor, borderColor: primaryColor }}>
                    主色按钮
                  </Button>
                  <Button type="default" style={{ color: secondaryColor, borderColor: secondaryColor }}>
                    辅助色按钮
                  </Button>
                  <div style={{
                    width: 80,
                    height: 32,
                    background: primaryColor,
                    borderRadius: 4,
                  }} />
                  <div style={{
                    width: 80,
                    height: 32,
                    background: secondaryColor,
                    borderRadius: 4,
                  }} />
                </Space>
              </Space>
            </Card>

            <Form.Item>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={updateMutation.isPending}
                size="large"
              >
                保存配置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
};

export default Branding;
