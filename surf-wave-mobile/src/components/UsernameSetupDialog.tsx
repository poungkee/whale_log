// 구글 신규 가입자 아이디 설정 안내 모달
// 노출 조건: authStore.showUsernameSetup === true (구글 + isNewUser)
// [지금 설정] → EditProfileScreen 으로 이동 / [나중에] → 모달 닫기
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';

interface UsernameSetupDialogProps {
  /** 모달 노출 여부 */
  visible: boolean;
  /** 현재 임시 아이디 (예: "서퍼1") - 사용자에게 어떤 아이디인지 알려줌 */
  currentUsername: string | null;
  /** [지금 설정] - EditProfileScreen 으로 이동 */
  onSetupNow: () => void;
  /** [나중에] - 모달 닫기 */
  onLater: () => void;
}

const UsernameSetupDialog: React.FC<UsernameSetupDialogProps> = ({
  visible, currentUsername, onSetupNow, onLater,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* 아이콘 */}
          <View style={styles.iconCircle}>
            <Sparkles size={28} color={colors.primary} />
          </View>

          {/* 제목 */}
          <Text style={styles.title}>아이디를 설정해보세요</Text>

          {/* 현재 임시 아이디 */}
          <Text style={styles.subText}>현재 임시 아이디는</Text>
          <Text style={styles.username}>{currentUsername || '서퍼'}</Text>

          {/* 설명 */}
          <Text style={styles.description}>
            나만의 아이디로 변경할 수 있어요.{'\n'}
            나중에 마이페이지에서도 언제든 변경 가능해요.
          </Text>

          {/* 버튼 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.laterButton} onPress={onLater}>
              <Text style={styles.laterText}>나중에</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.setupButton} onPress={onSetupNow}>
              <Text style={styles.setupText}>지금 설정</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  username: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  laterButton: {
    flex: 1, paddingVertical: 14,
    backgroundColor: colors.background,
    borderRadius: 12, alignItems: 'center',
  },
  laterText: { ...typography.body1, color: colors.textSecondary, fontWeight: '600' },
  setupButton: {
    flex: 1, paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12, alignItems: 'center',
  },
  setupText: { ...typography.body1, color: '#fff', fontWeight: '700' },
});

export default UsernameSetupDialog;
