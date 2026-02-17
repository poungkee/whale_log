/**
 * @file SpotVote.tsx
 * @description 오늘의 컨디션 투표 컴포넌트 - 스팟 상세 모달/카드에서 사용
 *
 * 기능:
 * - 👍 좋아요 / 👎 별로예요 투표 (하루 1회)
 * - 오늘 투표 결과 표시 (UP/DOWN 비율 바)
 * - 이미 투표한 경우 내 투표 표시
 *
 * API:
 * - GET /api/v1/spots/:spotId/votes - 투표 분포 조회
 * - POST /api/v1/spots/:spotId/vote - 투표 제출
 */

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface VoteDistribution {
  spotId: string;
  date: string;
  totalVotes: number;
  userVote: string | null; // 'UP' | 'DOWN' | null
}

interface SpotVoteProps {
  /** 스팟 ID */
  spotId: string;
  /** 컴팩트 모드 - 카드 내 작은 크기로 표시 */
  compact?: boolean;
}

export function SpotVote({ spotId, compact = false }: SpotVoteProps) {
  /** 투표 분포 데이터 */
  const [voteData, setVoteData] = useState<VoteDistribution | null>(null);
  /** 투표 제출 중 */
  const [submitting, setSubmitting] = useState(false);

  /** 투표 분포 조회 */
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/v1/spots/${spotId}/votes`, { headers });
        if (res.ok) {
          const data = await res.json();
          setVoteData(data);
        }
      } catch {
        // 투표 조회 실패 시 무시
      }
    };
    fetchVotes();
  }, [spotId]);

  /** 투표 제출 */
  const handleVote = async (voteType: 'UP' | 'DOWN') => {
    const token = localStorage.getItem('accessToken');
    if (!token) return; // 비로그인 시 투표 불가

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/spots/${spotId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });

      if (res.ok) {
        /** 투표 성공 → 분포 데이터 다시 조회 */
        const votesRes = await fetch(`/api/v1/spots/${spotId}/votes`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (votesRes.ok) {
          setVoteData(await votesRes.json());
        }
      }
    } catch {
      // 투표 실패 시 무시
    } finally {
      setSubmitting(false);
    }
  };

  /** 이미 투표 완료 여부 */
  const hasVoted = voteData?.userVote !== null && voteData?.userVote !== undefined;
  const totalVotes = voteData?.totalVotes || 0;

  if (compact) {
    /** 컴팩트 모드 - 카드 내 간단 표시 */
    return (
      <div className="flex items-center gap-2 text-[11px]">
        {totalVotes > 0 && (
          <span className="text-muted-foreground">
            투표 {totalVotes}명
          </span>
        )}
        {!hasVoted && (
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleVote('UP'); }}
              disabled={submitting}
              className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
            >
              👍
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleVote('DOWN'); }}
              disabled={submitting}
              className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              👎
            </button>
          </div>
        )}
        {hasVoted && (
          <span className="text-primary">
            {voteData?.userVote === 'UP' ? '👍 투표완료' : '👎 투표완료'}
          </span>
        )}
      </div>
    );
  }

  /** 풀사이즈 모드 - 상세 모달에서 사용 */
  return (
    <div className="bg-card/50 rounded-xl border border-border p-4">
      <h4 className="text-sm font-bold mb-3">오늘의 컨디션 투표</h4>

      {!hasVoted ? (
        /** 투표 전: 버튼 2개 표시 */
        <div className="flex gap-3">
          <button
            onClick={() => handleVote('UP')}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-5 h-5" />
            <span className="font-medium">좋아요</span>
          </button>
          <button
            onClick={() => handleVote('DOWN')}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <ThumbsDown className="w-5 h-5" />
            <span className="font-medium">별로예요</span>
          </button>
        </div>
      ) : (
        /** 투표 후: 결과 표시 */
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {voteData?.userVote === 'UP' ? '👍 좋아요에 투표했어요' : '👎 별로예요에 투표했어요'}
            </span>
            <span className="text-xs text-muted-foreground">
              총 {totalVotes}명 참여
            </span>
          </div>
        </div>
      )}

      {totalVotes === 0 && !hasVoted && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          첫 번째 투표자가 되어보세요!
        </p>
      )}
    </div>
  );
}
