"""The app screenshots on the website, made again from the app's own code.

    python _tools/app_screenshots.py <app checkout>/vocabmaster   (Desktop\VocabMaster-release)

A made-up learner ("Anna", Korean, five weeks in) in a throwaway folder —
never anyone's real words. The cards are the app's own sample deck; the
story and the café conversation are fixed texts, so no AI is called, and
the app is pointed at a dead server address. Needs PyQt6 and the 1.4.0+
code (account.py). Writes assets/img/shots/<name>.webp (2560 px) and
<name>-1280.webp. Windows: the fonts come from C:/Windows/Fonts."""
import json, os, random, shutil, sys, tempfile, time, uuid
from datetime import datetime, timedelta

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "..", "VocabMaster", "vocabmaster"))
WORK = tempfile.mkdtemp(prefix="vm-site-shots-")
OUT = os.path.join(WORK, "png")
os.makedirs(OUT)
os.environ["VOCABMASTER_DATA"] = os.path.join(WORK, "data")
os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ.setdefault("QT_QPA_FONTDIR", "C:/Windows/Fonts")
os.environ["QT_SCALE_FACTOR"] = os.environ.get("SHOT_SCALE", "2")
sys.path.insert(0, APP)

import paths
paths.app_dir = lambda: APP            # the icon; no data lives there
import account
account.SERVER = "http://127.0.0.1:9/v1"           # no server, ever
from PyQt6.QtCore import QTimer
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import QApplication
import badges, database, languages, practice, samples
from database import Database
from styles import FONT_SIZES, app_font_family, build_stylesheet

app = QApplication(sys.argv)
app.setFont(QFont(app_font_family(), FONT_SIZES["medium"]))
app.setStyleSheet(build_stylesheet("medium"))
import ui.flashcard as flashcard
flashcard._VBSCRIPT_OK = True
import ui.practice as ui_practice
ui_practice.has_voice = lambda language: True
flashcard.has_voice = lambda language: True
ui_practice.speak = lambda *a, **k: None
from ui.main_window import MainWindow

random.seed(11)
NOW = datetime.now()


def stamp(day, hour=19, minute=12):
    return (day.replace(hour=hour, minute=minute, second=0, microsecond=0)).strftime("%Y-%m-%d %H:%M:%S")


# ------------------------------------------------------------ a Korean learner, five weeks in
deck_dir = os.path.join(WORK, "data")
os.makedirs(deck_dir, exist_ok=True)
db = Database(os.path.join(deck_dir, "vocabmaster.db"))
for k, v in {"lang_target": "Korean", "lang_definition": "English", "lang_native": "English",
             "lang_second": "", "lang_confirmed": "1", "deck_name": "Anna", "daily_goal": "20",
             "max_new_per_day": "10", "session_cap": "20", "reminder_enabled": "0",
             "badges_welcomed": "", "study_direction": "forward"}.items():
    db.set_setting(k, v)
langs = languages.load(db.get_setting)
samples.add_to(db, langs, samples.path_for(langs))

FILLER = """가방 bag|가족 family|강 river|개 dog|고양이 cat|공원 park|공부 study|과일 fruit|교실 classroom|구름 cloud|
귀 ear|그림 picture|기차 train|길 road|꽃 flower|나무 tree|날씨 weather|남자 man|냉장고 fridge|노래 song|눈 eye|
다리 leg|달 moon|대학교 university|도서관 library|동생 younger sibling|마음 heart|머리 head|모자 hat|문 door|
바다 sea|바람 wind|밖 outside|방 room|버스 bus|병원 hospital|별 star|봄 spring|비 rain|빵 bread|사과 apple|산 mountain|
생일 birthday|선물 gift|선생님 teacher|손 hand|수업 class|시장 market|식당 restaurant|신발 shoes|아이 child|아침 morning|
안경 glasses|얼굴 face|여름 summer|여자 woman|역 station|영화 movie|옷 clothes|우유 milk|우산 umbrella|운동 exercise|
의자 chair|이름 name|일 work|입 mouth|자동차 car|잠 sleep|저녁 evening|전화 phone|점심 lunch|주말 weekend|지도 map|
지하철 subway|창문 window|책 book|책상 desk|커피 coffee|컴퓨터 computer|코 nose|택시 taxi|하늘 sky|학생 student|
학교 school|할머니 grandmother|할아버지 grandfather|회사 company|휴가 vacation|가을 autumn|겨울 winter|
계절 season|고기 meat|과자 snack|공항 airport|달걀 egg|딸기 strawberry|라면 ramen|문제 problem|사진 photo|여행 trip"""
filler = [item.strip().split(" ", 1) for item in FILLER.replace("\n", "").split("|") if item.strip()]
for word, meaning in filler:
    database.insert_card(db.conn, {"word": word, "definition": meaning, "greek": meaning, "pos": "n"})
db.conn.commit()

ids = {row["word"]: row["id"] for row in db.conn.execute("SELECT id, word FROM words")}
sample_words = [c["word"] for c in json.load(open(samples.path_for(langs), encoding="utf-8"))["cards"]]
filler_words = [w for w, _ in filler]


def progress(word, interval, reps, due_in_days, studied_days_ago, ease=2.5):
    db.conn.execute(
        "UPDATE progress SET interval=?, ease_factor=?, repetitions=?, due_date=?, last_studied=?, "
        "updated_at=? WHERE word_id=?",
        (interval, ease, reps, stamp(NOW + timedelta(days=due_in_days), 8),
         stamp(NOW - timedelta(days=studied_days_ago)), database.utc_stamp(), ids[word]))


for n, word in enumerate(filler_words):
    if n < 68:                                   # mastered
        progress(word, random.randint(22, 140), random.randint(4, 7), random.randint(2, 90), random.randint(3, 40))
    else:                                        # learning
        progress(word, random.randint(2, 15), random.randint(1, 3), random.randint(1, 12), random.randint(1, 9), 2.3)
# the sample words: 친구 first in today's round, a few more due, the rest not started yet
progress("친구", 6, 2, -2, 6)
for word in ("사람", "집", "물", "밥", "음식", "시간", "오늘", "먹다", "마시다"):
    progress(word, random.randint(3, 9), 2, random.choice((-1, 0)), random.randint(3, 8))
for word in ("돈", "내일", "가다", "오다"):
    progress(word, random.randint(25, 40), 4, random.randint(5, 30), random.randint(5, 20))
db.conn.commit()

# five weeks of rounds: 27 days in a row up to today, a few scattered days before
db.conn.execute("DELETE FROM sessions")
days = [NOW - timedelta(days=d) for d in range(0, 27)]
days += [NOW - timedelta(days=d) for d in range(28, 75) if random.random() < 0.55]
for day in days:
    reviewed = 12 if day.date() == NOW.date() else random.randint(14, 38)
    again = random.randint(0, 3); easy = random.randint(1, 6); hard = random.randint(1, 4)
    db.conn.execute(
        "INSERT INTO sessions (date, cards_reviewed, again_count, hard_count, good_count, easy_count, uid, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (day.strftime("%Y-%m-%d"), reviewed, again, hard, reviewed - again - hard - easy, easy,
         uuid.uuid4().hex, database.utc_stamp()))
db.conn.commit()
badges.catch_up(db)                               # what she has earned, quietly
# Hangul: most of the basic letters known
import alphabets
known = 0
for title, group in alphabets.drill_groups(alphabets.for_language("Korean"))[:2]:
    for symbol, reading, _ in group[:12]:
        db.conn.execute("INSERT OR REPLACE INTO alphabet_progress (lang, symbol, streak, seen, updated_at) "
                        "VALUES ('Korean', ?, 3, 4, ?)", (symbol, database.utc_stamp()))
        known += 1
db.conn.commit()
print("demo deck:", db.word_count(), "words | streak", db.current_streak(), "| hangul known", known)

# ------------------------------------------------------------ the window
w = MainWindow(db)
w.resize(1280, 800)
w.show()


def settle(seconds=0.6):
    end = time.time() + seconds
    while time.time() < end:
        app.processEvents()
        time.sleep(0.01)


def small_buttons():
    """The 36-px 🔊 buttons in Practice keep the app's 16-px side padding and
    show a sliver of the emoji (an app bug, noted for Mike) — unpadded here."""
    from PyQt6.QtWidgets import QPushButton
    for button in w.findChildren(QPushButton):
        if button.text() == "🔊" and button.width() <= 40:
            button.setStyleSheet("padding: 0;")


def shoot(name, widget=None):
    small_buttons()
    settle(0.4)
    pixmap = (widget or w).grab()
    path = os.path.join(OUT, name + ".png")
    pixmap.save(path)
    print("shot", name, pixmap.width(), "x", pixmap.height())


w.navigate("dashboard"); shoot("dashboard")

# study: the front, then the answer
w.navigate("study"); s = w.screens["study"]; settle(); shoot("study-front")
s.show_answer()
try:
    s.answer_animation.stop(); s.answer_effect.setOpacity(1.0)
except AttributeError:
    pass
shoot("study-back")

# practice: today's story
STORY = {
    "title": "민수의 하루 — Minsu's day",
    "sentences": [
        {"text": "오늘 민수는 아침에 물을 많이 마셔요.", "reading": "oneul minsuneun achime mureul mani masyeoyo.",
         "translation": "Today Minsu drinks a lot of water in the morning."},
        {"text": "그리고 친구 집에 가요.", "reading": "geurigo chingu jibe gayo.",
         "translation": "Then he goes to his friend's house."},
        {"text": "친구와 같이 밥을 먹어요.", "reading": "chinguwa gachi babeul meogeoyo.",
         "translation": "He has a meal together with his friend."},
        {"text": "음식이 정말 맛있어요!", "reading": "eumsigi jeongmal masisseoyo!",
         "translation": "The food is really delicious!"},
        {"text": "저녁에 민수는 피곤해요.", "reading": "jeonyeoge minsuneun pigonhaeyo.",
         "translation": "In the evening Minsu is tired."},
        {"text": "그래서 일찍 집에 와요.", "reading": "geuraeseo iljjik jibe wayo.",
         "translation": "So he comes home early."},
    ],
    "new_words": [{"word": "같이", "reading": "gachi", "meaning": "together"},
                  {"word": "일찍", "reading": "iljjik", "meaning": "early"}],
    "questions": [
        {"question": "Where does Minsu go?", "options": ["To school", "To his friend's house", "To a shop", "To work"], "answer": 1},
        {"question": "How is the food?", "options": ["Cold", "Really delicious", "Too spicy", "Expensive"], "answer": 1},
        {"question": "Why does he come home early?", "options": ["He is tired", "It is raining", "He has no money", "His friend is busy"], "answer": 0},
    ],
    "words_used": ["오늘", "물", "많이", "마시다", "친구", "집", "가다", "밥", "먹다", "음식", "맛있다", "피곤하다", "오다"],
}
w.navigate("practice"); p = w.screens["practice"]
p.mode_buttons[0].click(); p.show_page(0)
p.story = dict(STORY, _lang="Korean"); p.show_translations = True
p.render_story(); p.answer(0, 1)
shoot("story")

# practice: a conversation in a café (fixed lines; no AI)
TURNS = [
    {"feedback": None,
     "reply": {"text": "어서 오세요! 뭐 드릴까요?", "reading": "eoseo oseyo! mwo deurilkkayo?",
               "translation": "Welcome! What can I get you?"},
     "suggestions": [{"text": "커피 한 잔 주세요.", "reading": "keopi han jan juseyo.", "translation": "A cup of coffee, please."}],
     "finished": False},
    {"feedback": {"better": "커피 한 잔 주세요.", "better_reading": "keopi han jan juseyo",
                  "why": "For drinks, count the cups: 한 잔 = one cup."},
     "reply": {"text": "네! 따뜻한 커피 드릴까요?", "reading": "ne! ttatteutan keopi deurilkkayo?",
               "translation": "Sure! Would you like it hot?"},
     "suggestions": [{"text": "아니요, 차가운 커피 주세요.", "reading": "aniyo, chagaun keopi juseyo.", "translation": "No, an iced coffee, please."}],
     "finished": False},
    {"feedback": None,
     "reply": {"text": "알겠습니다. 사천 원입니다.", "reading": "algetseumnida. sacheon wonimnida.",
               "translation": "Got it. That's 4,000 won."},
     "suggestions": [{"text": "카드 돼요?", "reading": "kadeu dwaeyo?", "translation": "Can I pay by card?"},
                     {"text": "여기 있어요.", "reading": "yeogi isseoyo.", "translation": "Here you are."},
                     {"text": "감사합니다!", "reading": "gamsahamnida!", "translation": "Thank you!"}],
     "finished": False},
]
turn_index = [0]


def fake_turn(self, scene, level, history, said, conversation=None):
    result = TURNS[min(turn_index[0], len(TURNS) - 1)]
    turn_index[0] += 1
    return json.loads(json.dumps(result))


practice.TalkPartner.turn = fake_turn
p.mode_buttons[1].click(); settle()
p.scene_box.setCurrentIndex(0); p.start_talk.click(); settle(0.8)
for said in ("커피 하나 주세요.", "아니요, 차가운 커피 주세요."):
    p.say_box.setText(said); p.send_typed(); settle(0.8)
from PyQt6.QtWidgets import QScrollArea
area = next(a for a in p.findChildren(QScrollArea) if a.widget() and a.widget().isAncestorOf(p.chat_card))
top = p.chat_card.mapTo(area.widget(), p.chat_card.rect().topLeft()).y()
area.verticalScrollBar().setValue(max(0, top - 16)); settle(0.3)
shoot("talk")

# the alphabet
w.navigate("alphabet"); settle(); shoot("alphabet")

# progress
w.navigate("stats"); settle(); shoot("stats")

# a badge, celebrated
w.navigate("dashboard"); settle()
badge = next(b for b in badges.catalogue("Korean") if b.id == "words_100")
w._celebrate([badge]); settle(1.15); shoot("celebration")
w.close(); db.close()

# ------------------------------------------------------------ WebP for the website
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage
shots = os.path.join(SITE, "assets", "img", "shots")
os.makedirs(shots, exist_ok=True)
USED = {"study-back", "story", "talk", "alphabet", "stats", "celebration"}   # the tabs on the page
for name in sorted(os.listdir(OUT)):
    stem = name[:-4]
    if stem not in USED:
        continue
    image = QImage(os.path.join(OUT, name))
    image.save(os.path.join(shots, stem + ".webp"), "WEBP", 84)
    image.scaledToWidth(1280, Qt.TransformationMode.SmoothTransformation).save(
        os.path.join(shots, stem + "-1280.webp"), "WEBP", 82)
    print("saved", stem)
shutil.rmtree(WORK, ignore_errors=True)
