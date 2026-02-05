import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, typography, borderRadius } from '../../theme';

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
    { icon: 'water', label: 'Waves', value: `${forecast.waveHeight || '-'}m` },
    { icon: 'time', label: 'Period', value: `${forecast.wavePeriod || '-'}s` },
    { icon: 'leaf', label: 'Wind', value: `${forecast.windSpeed || '-'}km/h` },
    { icon: 'thermometer', label: 'Water', value: `${forecast.waterTemperature || '-'}°C` },
  ];

  return (
    <View style={styles.container}>
      {conditions.map((condition, index) => (
        <View key={index} style={styles.item}>
          <Icon name={condition.icon as any} size={24} color={colors.primary} />
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
