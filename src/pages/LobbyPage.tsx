import { useState } from 'react';
import type { AvailableRoom, RoomOptions, GameMode, CardCount, BotDifficulty } from '../types';
import InfoModal from '../components/InfoModal';
import './LobbyPage.css';

interface Props {
  onCreateRoom: (nickname: string, avatarIndex: number, options: Partial<RoomOptions>) => void;
  onJoinRoom: (roomCode: string, nickname: string, avatarIndex: number) => void;
  errorMsg: string;
  availableRooms: AvailableRoom[];
}

const AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮'];

export default function LobbyPage({ onCreateRoom, onJoinRoom, errorMsg, availableRooms }: Props) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'single'>('menu');
  const [nickname, setNickname] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [cardCount, setCardCount] = useState<CardCount>(4);
  const [joinCode, setJoinCode] = useState('');
  const [botCount, setBotCount] = useState(3);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('easy');
  const [addBots, setAddBots] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    onCreateRoom(nickname.trim(), avatarIndex, {
      gameMode,
      cardCount,
      ...(addBots ? { botCount, botDifficulty } : {}),
    });
  };

  const handleStartSingle = () => {
    if (!nickname.trim()) return;
    onCreateRoom(nickname.trim(), avatarIndex, {
      gameMode,
      cardCount,
      singlePlayerMode: true,
      botCount,
      botDifficulty,
    });
  };

  const handleJoin = (roomCode: string) => {
    if (!nickname.trim()) return;
    onJoinRoom(roomCode, nickname.trim(), avatarIndex);
  };

  if (mode === 'menu') {
    return (
      <div className="page lobby-page">
        <div className="lobby-title">
          <span className="lobby-icon">⛳</span>
          <h1>Golf Card Game</h1>
          <p className="text-muted">낮은 점수를 만들어라!</p>
        </div>
        <div className="lobby-buttons">
          <button className="btn btn-primary btn-large" onClick={() => setMode('create')}>
            방 만들기
          </button>
          <button className="btn btn-outline btn-large" onClick={() => setMode('join')}>
            방 참여하기
          </button>
          <button className="btn btn-outline btn-large" onClick={() => setMode('single')}>
            🤖 1인 플레이
          </button>
        </div>
        <div className="lobby-info-btns">
          <button className="btn btn-ghost" onClick={() => setShowHowToPlay(true)}>
            📖 게임 방법
          </button>
          <button className="btn btn-ghost" onClick={() => setShowAbout(true)}>
            💡 제작계기 & 후원
          </button>
        </div>

        {/* 게임 방법 모달 */}
        <InfoModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} title="게임 방법">
          <h3>게임 개요</h3>
          <p>
            골프 카드게임은 자신의 카드를 최대한 낮은 점수로 만드는 게임입니다.
            2~10명이 함께 즐길 수 있으며, 라운드 수를 설정할 수 있습니다.
          </p>

          <h3>게임 진행</h3>
          <ol>
            <li>각 플레이어에게 <span className="highlight">4장</span> 또는 <span className="highlight">6장</span>의 카드가 뒷면으로 배분됩니다.</li>
            <li>게임 시작 시 앞줄(아래) 카드만 미리 확인할 수 있습니다.</li>
            <li>자기 턴에 <strong>뽑기 더미</strong> 또는 <strong>버린 카드 더미</strong>에서 1장을 가져옵니다.</li>
            <li>버린 카드 더미에서 가져올 때는 <span className="highlight">땡큐!</span> 버튼을 눌러야 합니다.</li>
            <li>가져온 카드를 자기 카드와 <strong>교환</strong>하거나, 뽑기 더미에서 가져온 경우 <strong>버리고 한 장 뒤집기</strong>를 할 수 있습니다.</li>
            <li>버린 카드 더미에서 가져온 카드는 반드시 교환해야 합니다.</li>
            <li>모든 카드가 앞면이 되면 다른 플레이어들의 마지막 턴 1회 후 라운드가 종료됩니다.</li>
          </ol>

          <h3>점수 계산</h3>
          <table className="score-table">
            <thead>
              <tr><th>카드</th><th>점수</th></tr>
            </thead>
            <tbody>
              <tr><td>A</td><td>1점</td></tr>
              <tr><td>2~9</td><td>액면가</td></tr>
              <tr><td>10, K</td><td>0점</td></tr>
              <tr><td>J</td><td>11점</td></tr>
              <tr><td>Q</td><td>12점</td></tr>
            </tbody>
          </table>

          <h3>보너스</h3>
          <ul>
            <li><strong>페어</strong>: 같은 숫자 카드 2장 = 두 카드 모두 0점</li>
            <li><strong>스트레이트</strong> (상급자 모드): 연속된 4장 = 합계의 마이너스 점수</li>
            <li><strong>라운드 배수</strong> (상급자 모드): 마지막 전 라운드 x2, 마지막 라운드 x3</li>
          </ul>

          <h3>팁</h3>
          <p>
            낮은 카드(특히 10, K)를 모으고, 같은 숫자로 페어를 만들면 유리합니다.
            최저 점수를 목표로 하세요!
          </p>
        </InfoModal>

        {/* 제작계기 & 후원 모달 */}
        <InfoModal isOpen={showAbout} onClose={() => setShowAbout(false)} title="제작계기 & 후원">
          <h3>제작 계기</h3>
          <p>
            이 게임은 가족과 친구들이 함께 즐길 수 있는 온라인 카드게임을 만들고자 제작되었습니다.
            오프라인에서 즐기던 골프 카드게임을 어디서든 함께 할 수 있도록 만들었습니다.
          </p>

          <h3>개발자에게 연락하기</h3>
          <div className="contact-section">
            <div className="contact-row">
              <span className="contact-label">📧 이메일</span>
              <a href="mailto:atshane81@gmail.com" className="contact-value">
                atshane81@gmail.com
              </a>
            </div>
          </div>

          <h3>후원</h3>
          <div className="donate-section">
            <p>이 게임이 재미있으셨다면 후원으로 응원해 주세요!</p>
            <a
              href="https://qr.kakaopay.com/FN0023EGr"
              target="_blank"
              rel="noopener noreferrer"
              className="donate-link"
            >
              💛 카카오페이로 후원하기
            </a>
          </div>
        </InfoModal>
      </div>
    );
  }

  // Avatar + Nickname section (shared by create/join/single)
  const avatarNicknameSection = (
    <>
      <div className="avatar-picker">
        <label>아바타 선택</label>
        <div className="avatar-grid">
          {AVATARS.map((emoji, i) => (
            <button
              key={i}
              className={`avatar-btn ${i === avatarIndex ? 'selected' : ''}`}
              onClick={() => setAvatarIndex(i)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>닉네임</label>
        <input
          type="text"
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 12))}
          maxLength={12}
        />
      </div>
    </>
  );

  // Game options section (shared by create/single)
  const gameOptionsSection = (
    <>
      <div className="option-group">
        <label>게임 모드</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${gameMode === 'normal' ? 'active' : ''}`}
            onClick={() => setGameMode('normal')}
          >
            일반
          </button>
          <button
            className={`toggle-btn ${gameMode === 'advanced' ? 'active' : ''}`}
            onClick={() => setGameMode('advanced')}
          >
            상급자
          </button>
        </div>
      </div>
      <div className="option-group">
        <label>카드 수</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${cardCount === 4 ? 'active' : ''}`}
            onClick={() => setCardCount(4)}
          >
            4장 (2x2)
          </button>
          <button
            className={`toggle-btn ${cardCount === 6 ? 'active' : ''}`}
            onClick={() => setCardCount(6)}
          >
            6장 (2x3)
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="page lobby-page">
      <button className="btn btn-ghost back-btn" onClick={() => setMode('menu')}>
        ← 뒤로
      </button>

      <div className="lobby-form surface">
        <h2>
          {mode === 'create' ? '방 만들기' : mode === 'single' ? '1인 플레이' : '방 참여하기'}
        </h2>

        {avatarNicknameSection}

        {/* Create room options */}
        {mode === 'create' && (
          <div className="create-options">
            {gameOptionsSection}

            <div className="option-group">
              <label>봇 추가</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${!addBots ? 'active' : ''}`}
                  onClick={() => setAddBots(false)}
                >
                  없음
                </button>
                <button
                  className={`toggle-btn ${addBots ? 'active' : ''}`}
                  onClick={() => setAddBots(true)}
                >
                  추가
                </button>
              </div>
            </div>

            {addBots && (
              <>
                <div className="option-group">
                  <label>봇 수</label>
                  <div className="toggle-group bot-count-group">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        className={`toggle-btn ${botCount === n ? 'active' : ''}`}
                        onClick={() => setBotCount(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="option-group">
                  <label>봇 난이도</label>
                  <div className="toggle-group">
                    <button
                      className={`toggle-btn ${botDifficulty === 'easy' ? 'active' : ''}`}
                      onClick={() => setBotDifficulty('easy')}
                    >
                      쉬움
                    </button>
                    <button
                      className={`toggle-btn ${botDifficulty === 'medium' ? 'active' : ''}`}
                      onClick={() => setBotDifficulty('medium')}
                    >
                      보통
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!nickname.trim()}
            >
              방 만들기
            </button>
          </div>
        )}

        {/* Single player options */}
        {mode === 'single' && (
          <div className="create-options">
            {gameOptionsSection}

            <div className="option-group">
              <label>봇 수</label>
              <div className="toggle-group bot-count-group">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    className={`toggle-btn ${botCount === n ? 'active' : ''}`}
                    onClick={() => setBotCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label>봇 난이도</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${botDifficulty === 'easy' ? 'active' : ''}`}
                  onClick={() => setBotDifficulty('easy')}
                >
                  쉬움
                </button>
                <button
                  className={`toggle-btn ${botDifficulty === 'medium' ? 'active' : ''}`}
                  onClick={() => setBotDifficulty('medium')}
                >
                  보통
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleStartSingle}
              disabled={!nickname.trim()}
            >
              게임 시작
            </button>
          </div>
        )}

        {/* Join-specific */}
        {mode === 'join' && (
          <div className="join-options">
            <div className="form-field">
              <label>방 코드 입력</label>
              <div className="code-input-row">
                <input
                  type="text"
                  placeholder="방 코드"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                  maxLength={5}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleJoin(joinCode)}
                  disabled={!nickname.trim() || joinCode.length < 5}
                >
                  참여
                </button>
              </div>
            </div>

            {availableRooms.length > 0 && (
              <div className="room-list">
                <label>열린 방 목록</label>
                {availableRooms.map((room) => (
                  <div key={room.roomCode} className="room-item surface">
                    <div className="room-info">
                      <span className="room-host">{room.hostNickname}</span>
                      <div className="room-badges">
                        <span className="badge badge-accent">
                          {room.gameMode === 'advanced' ? '상급자' : '일반'}
                        </span>
                        <span className="badge badge-warning">{room.cardCount}장</span>
                        <span className="text-muted">
                          {room.playerCount}/{room.maxPlayers}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleJoin(room.roomCode)}
                      disabled={!nickname.trim()}
                    >
                      참여
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && <div className="error-toast">{errorMsg}</div>}
      </div>
    </div>
  );
}
