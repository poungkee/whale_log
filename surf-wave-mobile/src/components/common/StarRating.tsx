// 별점 컴포넌트 — 읽기 전용 또는 편집 가능
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, spacing } from '../../theme';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 24,
  editable = false,
  onRatingChange,
}) => {
  const handlePress = (index: number) => {
    if (editable && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <View style={styles.container}>
      {[...Array(maxStars)].map((_, index) => {
        const filled = index < rating;
        if (editable) {
          return (
            <TouchableOpacity key={index} onPress={() => handlePress(index)} activeOpacity={0.7}>
              <Star
                size={size}
                color={filled ? colors.warning : colors.gray300}
                fill={filled ? colors.warning : 'transparent'}
                style={styles.star}
              />
            </TouchableOpacity>
          );
        }
        return (
          <View key={index}>
            <Star
              size={size}
              color={filled ? colors.warning : colors.gray300}
              fill={filled ? colors.warning : 'transparent'}
              style={styles.star}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: spacing.xs / 2,
  },
});

export default StarRating;
