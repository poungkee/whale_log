import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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
        const StarComponent = editable ? TouchableOpacity : View;

        return (
          <StarComponent
            key={index}
            onPress={() => handlePress(index)}
            activeOpacity={0.7}
          >
            <Icon
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? colors.warning : colors.gray300}
              style={styles.star}
            />
          </StarComponent>
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
