import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '@carbon-point/design-system';
import { Button, Toast, Dialog, Input } from 'antd-mobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductDetail, exchangeProduct } from '@/api/mall';
import { useAuthStore } from '@/store/authStore';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [rechargeAccount, setRechargeAccount] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductDetail(id!),
    enabled: !!id,
  });

  const product = data?.data;

  const exchangeMutation = useMutation({
    mutationFn: exchangeProduct,
    onSuccess: (res) => {
      if (res.code === 200) {
        Toast.show('兑换成功');
        queryClient.invalidateQueries({ queryKey: ['pointsAccount'] });
        queryClient.invalidateQueries({ queryKey: ['myCoupons'] });
        navigate('/my-coupons');
      } else {
        Toast.show(res.message || '兑换失败');
      }
    },
    onError: () => Toast.show('网络错误'),
  });

  const handleExchange = () => {
    if (!product) return;
    if (!user?.tenantId || !user?.userId) {
      Toast.show('用户信息缺失');
      return;
    }
    if (product?.type === 'recharge') {
      Dialog.show({
        title: '请输入充值账号',
        content: (
          <Input
            placeholder="手机号/账号"
            value={rechargeAccount}
            onChange={setRechargeAccount}
          />
        ),
        actions: [
          { key: 'cancel', text: '取消' },
          {
            key: 'confirm',
            text: '确认',
            onClick: () => {
              if (!rechargeAccount) return;
              exchangeMutation.mutate({
                tenantId: user.tenantId,
                userId: user.userId,
                productId: id!,
                extraInfo: { account: rechargeAccount },
              });
            },
          },
        ],
      });
      return;
    }
    // Coupon / privilege - use Dialog.show for confirmation
    Dialog.show({
      title: '确认兑换',
      content: `确认使用 ${product.pointsPrice} 积分兑换 "${product.name}" 吗？`,
      closeOnAction: true,
      actions: [
        { key: 'cancel', text: '取消' },
        {
          key: 'confirm',
          text: '确认',
          onClick: () => {
            exchangeMutation.mutate({
              tenantId: user!.tenantId,
              userId: user!.userId,
              productId: id!,
              extraInfo: {},
            });
          },
        },
      ],
    });
  };

  if (isLoading || !product) {
    return (
      <div style={{ padding: 16 }}>
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            加载中...
          </div>
        </GlassCard>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    coupon: '优惠券',
    recharge: '直充',
    privilege: '权益',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: 16 }}>
        <div style={{ fontSize: 120, textAlign: 'center', marginBottom: 16 }}>
          {product.type === 'coupon' ? '🎫' : product.type === 'recharge' ? '📱' : '⭐'}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{product.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span
            style={{
              background: '#fff7e6',
              color: '#fa8c16',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {typeLabels[product.type] || product.type}
          </span>
          <span style={{ marginLeft: 12, color: '#ff4d4f', fontSize: 20, fontWeight: 'bold' }}>
            {product.pointsPrice} 积分
          </span>
        </div>
        <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{product.description}</p>
      </div>

      <GlassCard style={{ margin: 16 }} title="兑换说明">
        <ul style={{ paddingLeft: 20, fontSize: 14, color: '#666', lineHeight: 1.8, margin: 0 }}>
          <li>兑换后积分将自动扣除</li>
          <li>虚拟商品兑换后不可退款</li>
          <li>直充类商品请确保账号正确</li>
          <li>如有疑问请联系客服</li>
        </ul>
      </GlassCard>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          padding: '12px 16px',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Button
          block
          color="primary"
          size="large"
          disabled={product.stock === 0}
          loading={exchangeMutation.isPending}
          onClick={handleExchange}
        >
          {product.stock === 0 ? '库存不足' : `立即兑换 (${product.pointsPrice}积分)`}
        </Button>
      </div>
    </div>
  );
};

export default ProductDetailPage;
