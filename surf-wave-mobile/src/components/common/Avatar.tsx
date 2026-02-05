import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: AvatarSize;
}

const SIZES = {
  sm: 32,
  md: 48,
  lg: 80,
};

const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 'md' }) => {
  const dimension = SIZES[size];
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const containerStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
  };

  const textStyle = {
    fontSize: dimension * 0.4,
  };

  if (uri) {
    return (
      <Image source={{ uri }} style={[styles.image, containerStyle]} />
    );
  }

  return (
    <View style={[styles.fallback, containerStyle]}>
      <Text style={[styles.initials, textStyle]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.gray200,
  },
  fallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.textInverse,
    fontWeight: '600',
  },
});

export default Avatar;
