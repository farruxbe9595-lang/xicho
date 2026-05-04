const $ = (id) => document.getElementById(id);

const bank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
let selectedCategory = null;
let questions = [];
let currentIndex = 0;
let score = 0;
let answered = false;
let startedAt = null;
let timerInterval = null;
let lastQuizSize = '20';

const views = {
  home: $('homeView'),
  quiz: $('quizView'),
  result: $('resultView'),
};

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\u200b/g, '')
    .replace(/^\s*\*+\s*/, '')
    .replace(/\s*\*+\s*$/, '')
    .trim();
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showView(name) {
  Object.values(views).forEach((el) => el.classList.remove('active'));
  views[name].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHome() {
  $('directionCount').textContent = bank.length;
  $('questionCount').textContent = bank.reduce((sum, c) => sum + c.questions.length, 0);
  const query = normalizeText($('searchInput').value).toLowerCase();
  const list = $('directionList');
  const filtered = bank.filter((category) => category.title.toLowerCase().includes(query));

  if (!filtered.length) {
    list.innerHTML = `<div class="direction-card"><h3>Yo‘nalish topilmadi</h3><p>Qidiruv so‘zini o‘zgartirib ko‘ring.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map((category, index) => `
    <button class="direction-card" type="button" data-id="${category.id}">
      <h3>${escapeHtml(category.title)}</h3>
      <p>${category.questions.length} ta savol mavjud</p>
      <div class="card-bottom">
        <span class="badge">Boshlash</span>
        <span>№ ${index + 1}</span>
      </div>
    </button>
  `).join('');

  list.querySelectorAll('.direction-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const category = bank.find((item) => item.id === id);
      if (category) startQuiz(category);
    });
  });
}

function startQuiz(category) {
  selectedCategory = category;
  lastQuizSize = $('testSizeSelect').value;
  const allQuestions = shuffle(category.questions.map((q) => ({
    text: normalizeText(q.text),
    correctAnswer: normalizeText(q.correctAnswer),
    answers: shuffle((q.answers || []).map(normalizeText).filter(Boolean)),
  })).filter((q) => q.text && q.correctAnswer && q.answers.length >= 2));

  const size = lastQuizSize === 'all' ? allQuestions.length : Math.min(Number(lastQuizSize), allQuestions.length);
  questions = allQuestions.slice(0, size);
  currentIndex = 0;
  score = 0;
  answered = false;
  startedAt = Date.now();
  $('quizCategory').textContent = category.title;
  $('quizTitle').textContent = `${questions.length} ta savollik test`;
  $('scoreText').textContent = 'To‘g‘ri: 0';
  $('nextBtn').textContent = 'Keyingi savol';
  $('nextBtn').disabled = true;
  startTimer();
  showView('quiz');
  renderQuestion();
}

function renderQuestion() {
  const question = questions[currentIndex];
  answered = false;
  $('feedback').className = 'feedback';
  $('feedback').textContent = '';
  $('nextBtn').disabled = true;
  $('nextBtn').textContent = currentIndex === questions.length - 1 ? 'Natijani ko‘rish' : 'Keyingi savol';

  $('progressText').textContent = `${currentIndex + 1} / ${questions.length}`;
  $('scoreText').textContent = `To‘g‘ri: ${score}`;
  $('progressFill').style.width = `${((currentIndex) / questions.length) * 100}%`;
  $('questionText').textContent = question.text;

  const answers = shuffle(question.answers);
  $('answersList').innerHTML = answers.map((answer) => `
    <button class="answer-btn" type="button" data-answer="${encodeURIComponent(answer)}">${escapeHtml(answer)}</button>
  `).join('');

  $('answersList').querySelectorAll('.answer-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(btn));
  });
}

function handleAnswer(button) {
  if (answered) return;
  answered = true;
  const question = questions[currentIndex];
  const selected = decodeURIComponent(button.getAttribute('data-answer'));
  const correct = question.correctAnswer;
  const isCorrect = selected === correct;

  if (isCorrect) {
    score += 1;
    $('feedback').textContent = 'To‘g‘ri javob!';
    $('feedback').className = 'feedback ok';
  } else {
    $('feedback').textContent = `Noto‘g‘ri. To‘g‘ri javob: ${correct}`;
    $('feedback').className = 'feedback bad';
  }

  $('answersList').querySelectorAll('.answer-btn').forEach((btn) => {
    const answer = decodeURIComponent(btn.getAttribute('data-answer'));
    btn.disabled = true;
    if (answer === correct) btn.classList.add('correct');
    if (btn === button && !isCorrect) btn.classList.add('wrong');
  });

  $('scoreText').textContent = `To‘g‘ri: ${score}`;
  $('progressFill').style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  $('nextBtn').disabled = false;
}

function nextQuestion() {
  if (!answered) return;
  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  stopTimer();
  const percent = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const elapsed = formatTime(Date.now() - startedAt);
  $('resultTitle').textContent = selectedCategory ? selectedCategory.title : 'Test yakunlandi';
  $('resultPercent').textContent = `${percent}%`;
  $('resultDetails').textContent = `${questions.length} ta savoldan ${score} tasi to‘g‘ri. Sarflangan vaqt: ${elapsed}.`;
  localStorage.setItem('xicho:lastScore', `${selectedCategory?.title || 'Test'} — ${score}/${questions.length} (${percent}%)`);
  renderLastScore();
  showView('result');
}

function startTimer() {
  stopTimer();
  $('timer').textContent = '00:00';
  timerInterval = setInterval(() => {
    $('timer').textContent = formatTime(Date.now() - startedAt);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const minutes = String(Math.floor(sec / 60)).padStart(2, '0');
  const seconds = String(sec % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderLastScore() {
  const last = localStorage.getItem('xicho:lastScore');
  $('lastScore').textContent = last ? `Oxirgi natija: ${last}` : '';
}

$('searchInput').addEventListener('input', renderHome);
$('nextBtn').addEventListener('click', nextQuestion);
$('backBtn').addEventListener('click', () => {
  stopTimer();
  showView('home');
});
$('homeBtn').addEventListener('click', () => showView('home'));
$('retryBtn').addEventListener('click', () => {
  if (selectedCategory) startQuiz(selectedCategory);
});
$('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('xicho:theme', isLight ? 'light' : 'dark');
  $('themeBtn').textContent = isLight ? '☀️' : '🌙';
});

(function init() {
  const savedTheme = localStorage.getItem('xicho:theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light');
    $('themeBtn').textContent = '☀️';
  }
  renderHome();
  renderLastScore();
})();
