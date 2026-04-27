import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
  earnedAt?: string;
}

const BadgesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'missing'>('all');
  const [loading, setLoading] = useState(false);

  const mockBadges: Badge[] = [
    {
      id: '1',
      name: '初来乍到',
      description: '完成首次楼梯打卡',
      icon: 'star',
      rarity: 'common',
      earned: true,
      earnedAt: '2024-04-01',
    },
    {
      id: '2',
      name: '坚持一周',
      description: '连续打卡7天',
      icon: 'star',
      rarity: 'common',
      earned: true,
      earnedAt: '2024-04-10',
    },
    {
      id: '3',
      name: '月度达人',
      description: '连续打卡30天',
      icon: 'star',
      rarity: 'rare',
      earned: false,
    },
    {
      id: '4',
      name: '百日传奇',
      description: '连续打卡100天',
      icon: 'star',
      rarity: 'legendary',
      earned: false,
    },
    {
      id: '5',
      name: '白银之星',
      description: '晋升为白银等级',
      icon: 'star',
      rarity: 'rare',
      earned: true,
      earnedAt: '2024-04-15',
    },
    {
      id: '6',
      name: '黄金荣耀',
      description: '晋升为黄金等级',
      icon: 'star',
      rarity: 'epic',
      earned: false,
    },
  ];

  const filteredBadges = mockBadges.filter(badge => {
    if (activeTab === 'earned') return badge.earned;
    if (activeTab === 'missing') return !badge.earned;
    return true;
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#94A3B8';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#94A3B8';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return '普通';
      case 'rare': return '稀有';
      case 'epic': return '史诗';
      case 'legendary': return '传说';
      default: return rarity;
    }
  };

  const earnedCount = mockBadges.filter(b => b.earned).length;
  const totalCount = mockBadges.length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>我的徽章</Text>
        <View style={styles.stats}>
          <Text style={styles.statText}>
            <Text style={styles.statCount}>{earnedCount}</Text>
            <Text style={styles.statTotal}>/{totalCount}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>全部</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earned' && styles.tabActive]}
          onPress={() => setActiveTab('earned')}
        >
          <Text style={[styles.tabText, activeTab === 'earned' && styles.tabTextActive]}>已获得</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'missing' && styles.tabActive]}
          onPress={() => setActiveTab('missing')}
        >
          <Text style={[styles.tabText, activeTab === 'missing' && styles.tabTextActive]}>未获得</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.badgeGrid}>
          {filteredBadges.map(badge => (
            <View
              key={badge.id}
              style={[styles.badgeCard, !badge.earned && styles.badgeLocked]}
            >
              <View
                style={[
                  styles.badgeIconContainer,
                  { backgroundColor: getRarityColor(badge.rarity) + '20' },
                ]}
              >
                <Ionicons
                  name={badge.earned ? 'star' : 'lock-closed'}
                  size={40}
                  color={getRarityColor(badge.rarity)}
                />
              </View>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeRarity}>{getRarityLabel(badge.rarity)}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>
              {badge.earnedAt && (
                <Text style={styles.badgeDate}>获得于 {badge.earnedAt}</Text>
              )}
            </View>
          ))}
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  stats: {
    marginTop: 8,
  },
  statText: {
    fontSize: 16,
    color: '#64748B',
  },
  statCount: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statTotal: {
    color: '#94A3B8',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  badgeCard: {
    width: '50%',
    padding: 8,
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIconContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  badgeRarity: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 11,
    color: '#CBD5E1',
  },
});

export default BadgesPage;
