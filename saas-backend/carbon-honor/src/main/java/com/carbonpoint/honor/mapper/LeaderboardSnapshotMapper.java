package com.carbonpoint.honor.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.carbonpoint.honor.entity.LeaderboardSnapshot;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for leaderboard_snapshots table.
 */
@Mapper
public interface LeaderboardSnapshotMapper extends BaseMapper<LeaderboardSnapshot> {
}
