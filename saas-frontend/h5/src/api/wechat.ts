import { apiClient } from './request';

export interface WeChatConfigResponse {
  appId: string;
  timestamp: string;
  nonceStr: string;
  signature: string;
}

export interface WeChatLocationVerifyParams {
  latitude: number;
  longitude: number;
  ruleId: number;
}

export interface LocationVerifyResponse {
  allowed: boolean;
  distance?: number;
  message?: string;
}

export const getWeChatConfig = async (url: string): Promise<{ data: WeChatConfigResponse }> => {
  const res = await apiClient.get('/wechat/config', { params: { url } });
  return res.data;
};

export const verifyLocation = async (
  params: WeChatLocationVerifyParams
): Promise<{ data: LocationVerifyResponse }> => {
  const res = await apiClient.post('/wechat/location/verify', params);
  return res.data;
};
