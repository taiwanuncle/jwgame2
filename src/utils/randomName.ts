/**
 * Random nickname generator
 * Combines a Korean adjective (~100) + noun name (~140: animals + plants + famous people)
 * e.g. "용감한 호랑이", "졸린 해바라기", "느긋한 아인슈타인"
 */

const MAX_NICKNAME_LENGTH = 12;
const AVATAR_COUNT = 12; // number of avatars in AVATARS array

const ADJECTIVES: string[] = [
  "용감한", "지혜로운", "겸손한", "씩씩한", "명랑한", "재빠른", "든든한", "활발한",
  "다정한", "충실한", "당당한", "꿋꿋한", "상냥한", "부지런한", "정직한", "슬기로운",
  "대담한", "온화한", "쾌활한", "단호한", "꼼꼼한", "느긋한", "열정적인", "소심한",
  "유쾌한", "담대한", "순수한", "멋진", "착한", "빠른", "강한", "밝은",
  "조용한", "힘센", "작은", "큰", "귀여운", "졸린", "배고픈", "신나는",
  "행복한", "웃긴", "엉뚱한", "영리한", "똑똑한", "느린", "차분한", "시끄러운",
  "수줍은", "거친", "부드러운", "날렵한", "묵직한", "가벼운", "진지한", "장난꾸러기",
  "인내하는", "감사하는", "사랑하는", "노래하는", "춤추는", "달리는", "웃는",
  "생각하는", "꿈꾸는", "배우는", "가르치는", "돕는", "나누는", "기다리는",
  "응원하는", "감동하는", "놀라운",
  "특별한", "소중한", "따뜻한", "시원한", "반짝이는", "빛나는", "향기로운", "아름다운",
  "평화로운", "자유로운", "기쁜", "신비한", "놀란", "설레는", "두근두근",
  "포근한", "알뜰한", "늠름한", "너그러운",
];

/** Animals (~50) */
const ANIMALS: string[] = [
  "호랑이", "사자", "독수리", "펭귄", "고래", "돌고래", "판다", "코끼리",
  "기린", "늑대", "여우", "토끼", "다람쥐", "고양이", "강아지", "곰",
  "수달", "해달", "부엉이", "올빼미", "매", "참새", "까치", "두루미",
  "백조", "플라밍고", "앵무새", "카멜레온", "거북이", "문어", "해파리", "상어",
  "연어", "치타", "표범", "코알라", "캥거루", "하마", "코뿔소", "악어",
  "이구아나", "햄스터", "고슴도치", "미어캣", "알파카", "비버", "오리", "나비",
  "잠자리", "무당벌레",
];

/** Plants (~45) */
const PLANTS: string[] = [
  "해바라기", "장미", "벚꽃", "민들레", "튤립", "라벤더", "백합", "수선화",
  "은행나무", "소나무", "대나무", "단풍나무", "버드나무", "참나무", "매화", "목련",
  "코스모스", "국화", "동백", "진달래", "개나리", "아카시아", "선인장", "클로버",
  "제비꽃", "수련", "연꽃", "허브", "로즈마리", "바질", "선인장", "올리브",
  "감나무", "사과나무", "포도나무", "유칼립투스", "자작나무", "팜나무", "무궁화", "히비스커스",
  "데이지", "아이리스", "카네이션", "프리지아", "수국",
];

/** Famous people (~50, short recognizable names) */
const CELEBRITIES: string[] = [
  "아인슈타인", "뉴턴", "에디슨", "다빈치", "피카소", "모차르트", "베토벤", "바흐",
  "셰익스피어", "간디", "링컨", "처칠", "나폴레옹", "클레오파트라", "콜럼버스",
  "다윈", "갈릴레이", "퀴리부인", "테슬라", "호킹",
  "세종대왕", "이순신", "장영실", "허준", "유관순",
  "헤밍웨이", "톨스토이", "쇼팽", "고흐", "모네",
  "찰리채플린", "헵번", "먼로", "엘비스",
  "마이클잭슨", "비틀즈", "프레디", "보위",
  "조던", "메시", "손흥민", "펠레", "타이거우즈",
  "스티브잡스", "빌게이츠", "머스크",
  "해리포터", "셜록홈즈", "스파이더맨", "피노키오",
];

/** All names combined */
const ALL_NAMES: string[] = [...ANIMALS, ...PLANTS, ...CELEBRITIES];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a random avatar index + nickname */
export function generateRandomName(): { avatarIndex: number; nickname: string } {
  const adj = pickRandom(ADJECTIVES);
  const name = pickRandom(ALL_NAMES);

  let nickname = `${adj} ${name}`;

  // Truncate if too long for the 12-char limit
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    nickname = nickname.slice(0, MAX_NICKNAME_LENGTH);
  }

  return {
    avatarIndex: Math.floor(Math.random() * AVATAR_COUNT),
    nickname,
  };
}
