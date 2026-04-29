import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  InputNumber,
  message,
  Empty,
  Spin,
  Modal,
  Image,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  GiftOutlined,
  ShopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchShelfProducts,
  fetchAvailableProducts,
  addToShelf,
  removeFromShelf,
  updateExchangeRate,
  AvailableProduct,
  ShelfProduct,
} from '@/api/mall';
import { useBranding } from '@/components/BrandingProvider';
import { extractArray } from '@/utils';

const TYPE_OPTIONS: Record<string, { label: string; color: string }> = {
  coupon: { label: '优惠券', color: '#1890ff' },
  recharge: { label: '直充', color: '#52c41a' },
  privilege: { label: '权益', color: '#fa8c16' },
};

const formatPrice = (cents: number) => {
  const yuan = cents / 100;
  return `¥${yuan.toFixed(2)}`;
};

const DEFAULT_EXCHANGE_RATE = 100; // 100 points = 1 RMB

const MallShelf: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editingShelfProduct, setEditingShelfProduct] = useState<ShelfProduct | null>(null);
  const [newRate, setNewRate] = useState<number>(DEFAULT_EXCHANGE_RATE);

  // Fetch shelved products
  const { data: shelfData, isLoading: shelfLoading, refetch: refetchShelf } = useQuery({
    queryKey: ['mall-shelf'],
    queryFn: fetchShelfProducts,
    retry: false,
  });

  // Fetch available (un-shelved) products
  const { data: availableData, isLoading: availableLoading, refetch: refetchAvailable } = useQuery({
    queryKey: ['mall-available-products'],
    queryFn: fetchAvailableProducts,
    retry: false,
  });

  const shelfProducts: ShelfProduct[] = extractArray<ShelfProduct>(shelfData);
  const availableProducts: AvailableProduct[] = extractArray<AvailableProduct>(availableData);

  const addMutation = useMutation({
    mutationFn: (data: { platformProductId: string; pointsExchangeRate?: number }) => addToShelf(data),
    onSuccess: () => {
      message.success('上架成功');
      queryClient.invalidateQueries({ queryKey: ['mall-shelf'] });
      queryClient.invalidateQueries({ queryKey: ['mall-available-products'] });
    },
    onError: () => message.error('上架失败'),
  });

  const removeMutation = useMutation({
    mutationFn: removeFromShelf,
    onSuccess: () => {
      message.success('下架成功');
      queryClient.invalidateQueries({ queryKey: ['mall-shelf'] });
      queryClient.invalidateQueries({ queryKey: ['mall-available-products'] });
    },
    onError: () => message.error('下架失败'),
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) => updateExchangeRate(id, rate),
    onSuccess: () => {
      message.success('兑换比例更新成功');
      setRateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['mall-shelf'] });
    },
    onError: () => message.error('更新失败'),
  });

  const openRateModal = (product: ShelfProduct) => {
    setEditingShelfProduct(product);
    setNewRate(product.pointsExchangeRate || DEFAULT_EXCHANGE_RATE);
    setRateModalOpen(true);
  };

  const handleAddToShelf = (product: AvailableProduct) => {
    addMutation.mutate({
      platformProductId: product.id,
      pointsExchangeRate: DEFAULT_EXCHANGE_RATE,
    });
  };

  const handleRemoveFromShelf = (product: ShelfProduct) => {
    removeMutation.mutate(product.id);
  };

  const computePointsPrice = (priceCents: number, rate: number) => {
    return Math.ceil((priceCents / 100) * rate);
  };

  // Color palette
  const colors = {
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
  };

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      {/* Page Header */}
      {!hideHeader && (
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 4,
              color: colors.textHeading,
            }}
          >
            积分商城上架
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
            从平台商品池中选择商品上架，配置积分兑换比例
          </p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => { refetchShelf(); refetchAvailable(); }}
          style={{ borderRadius: 20 }}
        >
          刷新
        </Button>
      </div>
      )}

      <Row gutter={20}>
        {/* Left Panel: Available Products */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <ShopOutlined />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>可上架商品</span>
                <Tag color="blue">{availableProducts.length}</Tag>
              </Space>
            }
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
              height: '100%',
            }}
            styles={{ body: { padding: 16, maxHeight: 600, overflowY: 'auto' } }}
          >
            <Spin spinning={availableLoading}>
              {availableProducts.length === 0 ? (
                <Empty description="暂无可上架商品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {availableProducts.map((product) => {
                    const typeConfig = TYPE_OPTIONS[product.type] || { label: product.type, color: '#999' };
                    return (
                      <div
                        key={product.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: 16,
                          borderRadius: 12,
                          border: `1px solid ${colors.warmBorder}`,
                          background: colors.bgSoft,
                          gap: 12,
                        }}
                      >
                        {/* Product Image */}
                        {product.image ? (
                          <Image
                            src={product.image}
                            width={56}
                            height={56}
                            preview={false}
                            style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 10,
                              background: '#f0ede8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <GiftOutlined style={{ fontSize: 24, color: '#bbb' }} />
                          </div>
                        )}

                        {/* Product Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: colors.textHeading, fontSize: 14, marginBottom: 4 }}>
                            {product.name}
                          </div>
                          <Space size={8}>
                            <Tag
                              style={{
                                borderRadius: 10,
                                margin: 0,
                                background: `${typeConfig.color}15`,
                                color: typeConfig.color,
                                border: 'none',
                              }}
                            >
                              {typeConfig.label}
                            </Tag>
                            <span style={{ color: colors.textMuted, fontSize: 13 }}>
                              {formatPrice(product.price)}
                            </span>
                          </Space>
                        </div>

                        {/* Add Button */}
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => handleAddToShelf(product)}
                          loading={addMutation.isPending}
                          style={{
                            borderRadius: 20,
                            background: primaryColor,
                            border: 'none',
                            flexShrink: 0,
                          }}
                        >
                          上架
                        </Button>
                      </div>
                    );
                  })}
                </Space>
              )}
            </Spin>
          </Card>
        </Col>

        {/* Right Panel: Shelved Products */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <GiftOutlined />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>已上架商品</span>
                <Tag color="green">{shelfProducts.length}</Tag>
              </Space>
            }
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.warmBorder}`,
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
              height: '100%',
            }}
            styles={{ body: { padding: 16, maxHeight: 600, overflowY: 'auto' } }}
          >
            <Spin spinning={shelfLoading}>
              {shelfProducts.length === 0 ? (
                <Empty description="暂未上架任何商品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {shelfProducts.map((product) => {
                    const typeConfig = TYPE_OPTIONS[product.type] || { label: product.type, color: '#999' };
                    const rate = product.pointsExchangeRate || DEFAULT_EXCHANGE_RATE;
                    const pointsPrice = computePointsPrice(product.price, rate);
                    return (
                      <div
                        key={product.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: 16,
                          borderRadius: 12,
                          border: `1px solid ${primaryColor}30`,
                          background: `${primaryColor}08`,
                          gap: 12,
                        }}
                      >
                        {/* Product Image */}
                        {product.image ? (
                          <Image
                            src={product.image}
                            width={56}
                            height={56}
                            preview={false}
                            style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 10,
                              background: `${primaryColor}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <GiftOutlined style={{ fontSize: 24, color: primaryColor }} />
                          </div>
                        )}

                        {/* Product Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: colors.textHeading, fontSize: 14, marginBottom: 4 }}>
                            {product.name}
                          </div>
                          <Space size={8} wrap>
                            <Tag
                              style={{
                                borderRadius: 10,
                                margin: 0,
                                background: `${typeConfig.color}15`,
                                color: typeConfig.color,
                                border: 'none',
                              }}
                            >
                              {typeConfig.label}
                            </Tag>
                            <span style={{ color: colors.textMuted, fontSize: 13 }}>
                              {formatPrice(product.price)}
                            </span>
                            <Tag
                              icon={<SwapOutlined />}
                              style={{
                                borderRadius: 10,
                                margin: 0,
                                background: `${primaryColor}15`,
                                color: primaryColor,
                                border: 'none',
                              }}
                            >
                              {rate}积分=1元
                            </Tag>
                          </Space>
                          <div
                            style={{
                              marginTop: 4,
                              fontFamily: 'Outfit, sans-serif',
                              fontSize: 16,
                              fontWeight: 600,
                              color: primaryColor,
                            }}
                          >
                            {pointsPrice} 积分
                          </div>
                        </div>

                        {/* Actions */}
                        <Space direction="vertical" size={4} style={{ flexShrink: 0 }}>
                          <Tooltip title="修改兑换比例">
                            <Button
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => openRateModal(product)}
                              style={{ borderRadius: 16, width: '100%' }}
                            >
                              兑换比例
                            </Button>
                          </Tooltip>
                          <Button
                            size="small"
                            danger
                            icon={<MinusOutlined />}
                            onClick={() => handleRemoveFromShelf(product)}
                            loading={removeMutation.isPending}
                            style={{ borderRadius: 16, width: '100%' }}
                          >
                            下架
                          </Button>
                        </Space>
                      </div>
                    );
                  })}
                </Space>
              )}
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Exchange Rate Edit Modal */}
      <Modal
        title="修改积分兑换比例"
        open={rateModalOpen}
        onCancel={() => setRateModalOpen(false)}
        onOk={() => {
          if (editingShelfProduct) {
            updateRateMutation.mutate({ id: editingShelfProduct.id, rate: newRate });
          }
        }}
        confirmLoading={updateRateMutation.isPending}
        okText="保存"
        cancelText="取消"
        width={420}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: colors.textMuted, marginBottom: 8 }}>
            商品：{editingShelfProduct?.name}
          </p>
          <p style={{ color: colors.textMuted, marginBottom: 16, fontSize: 13 }}>
            当前原价：{formatPrice(editingShelfProduct?.price || 0)}
          </p>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>积分兑换比例（多少积分 = 1元）</div>
          <InputNumber
            value={newRate}
            onChange={(v) => setNewRate(v ?? DEFAULT_EXCHANGE_RATE)}
            min={1}
            max={10000}
            style={{ width: '100%' }}
            addonAfter="积分 = 1元"
          />
          {editingShelfProduct && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: `${primaryColor}08`,
                border: `1px solid ${primaryColor}20`,
              }}
            >
              <span style={{ color: colors.textMuted, fontSize: 13 }}>积分预览：</span>
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: primaryColor,
                  marginLeft: 8,
                }}
              >
                {computePointsPrice(editingShelfProduct.price, newRate)} 积分
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MallShelf;
