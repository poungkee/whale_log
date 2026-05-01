/**
 * @file UsernameSetupDialog.tsx
 * @description 구글 신규 가입자용 아이디 설정 안내 팝업
 *
 * 노출 조건: 구글 소셜 로그인 후 isNewUser=true 응답일 때
 * (구글은 닉네임을 받아오지 못하므로 시퀀스로 "서퍼N" 임시 부여 → 사용자에게 변경 권장)
 *
 * 동작:
 * - [지금 설정] → 마이페이지 아이디 변경 섹션으로 이동
 * - [나중에]   → 팝업 닫기 (임시 아이디 그대로 사용, 나중에 마이페이지에서 변경 가능)
 */

import { Sparkles } from 'lucide-react';

interface UsernameSetupDialogProps {
  /** 임시 부여된 아이디 (예: "서퍼1") - 사용자에게 보여줘서 어떤 아이디인지 알려줌 */
  currentUsername: string | null;
  /** [지금 설정] 클릭 - 마이페이지 아이디 변경 화면으로 이동 */
  onSetupNow: () => void;
  /** [나중에] 클릭 - 팝업만 닫기 */
  onLater: () => void;
}

export function UsernameSetupDialog({ currentUsername, onSetupNow, onLater }: UsernameSetupDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* 헤더 아이콘 */}
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>

        {/* 제목 */}
        <h2 className="text-lg font-bold text-center mb-2">아이디를 설정해보세요</h2>

        {/* 설명 */}
        <p className="text-sm text-muted-foreground text-center mb-2">
          현재 임시 아이디는
        </p>
        <p className="text-base font-semibold text-center mb-3 text-primary">
          {currentUsername || '서퍼'}
        </p>
        <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
          나만의 아이디로 변경할 수 있어요.<br />
          나중에 마이페이지에서도 언제든 변경 가능해요.
        </p>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onLater}
            className="flex-1 py-3 bg-secondary rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            나중에
          </button>
          <button
            onClick={onSetupNow}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            지금 설정
          </button>
        </div>
      </div>
    </div>
  );
}
