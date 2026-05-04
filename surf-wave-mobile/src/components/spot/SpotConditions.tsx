// 스팟 파도 컨디션 — 파고/주기/풍속/수온 표시
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Waves, Clock, Wind, Thermometer } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatWindSpeed } from '../../lib/units';

interface Forecast {
  waveHeight?: number;
  wavePeriod?: number;
  windSpeed?: number;
  windDirection?: string;
  tideStatus?: string;
  waterTemperature?: number;
}

interface SpotConditionsProps {
  forecast: Forecast;
}

const SpotConditions: React.FC<SpotConditionsProps> = ({ forecast }) => {
  const conditions = [
    { Icon: Waves, label: '파고', value: `${forecast.waveHeight || '-'}m` },
    { Icon: Clock, label: '주기', value: `${forecast.wavePeriod || '-'}s` },
    { Icon: Wind, label: '바람', value: forecast.windSpeed != null ? formatWindSpeed(forecast.windSpeed) : '-' },
    { Icon: Thermometer, label: '수온', value: `${forecast.waterTemperature || '-'}°C` },
  ];

  return (
    <View style={styles.container}>
      {conditions.map((condition, index) => (
        <View key={index} style={styles.item}>
          <condition.Icon size={24} color={colors.primary} />
          <Text style={styles.value}>{condition.value}</Text>
          <Text style={styles.label}>{condition.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default SpotConditions;
