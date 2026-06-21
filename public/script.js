// Mo.dark – BlackBox Client (نسخة نهائية)
let currentUser = null;
let currentLevel = 'low';
let gameLocked = false;
let boxesData = [];

// === بيانات الترجمة (متعددة اللغات) ===
const langData = {
    ar: {
        title: 'الصندوق الأسود',
        balance: 'رصيدك',
        login: 'تسجيل الدخول',
        email: 'البريد الإلكتروني',
        wallet: 'عنوان محفظة Binance (USDT)',
        loginBtn: 'دخول / تسجيل',
        level: 'اختر مستوى المخاطرة',
        low: 'منخفض',
        medium: 'متوسط',
        high: 'مرتفع',
        bet: 'الرهان',
        play: 'اختر صندوقاً',
        deposit: 'إيداع',
        withdraw: 'طلب سحب',
        leaders: 'المتصدرون اليوم',
        recent: 'آخر المعاملات',
        logout: 'تسجيل خروج',
        win: 'ربحت!',
        lose: 'خسرت!',
        multiplier: 'المضاعف',
        profit: 'الربح'
    },
    en: {
        title: 'Black Box',
        balance: 'Balance',
        login: 'Login',
        email: 'Email',
        wallet: 'Binance Wallet Address (USDT)',
        loginBtn: 'Login / Register',
        level: 'Select Risk Level',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        bet: 'Bet',
        play: 'Pick a Box',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        leaders: 'Today\'s Leaders',
        recent: 'Recent Transactions',
        logout: 'Logout',
        win: 'You Win!',
        lose: 'You Lose!',
        multiplier: 'Multiplier',
        profit: 'Profit'
    },
    tr: {
        title: 'Kara Kutu',
        balance: 'Bakiye',
        login: 'Giriş Yap',
        email: 'E-posta',
        wallet: 'Binance Cüzdan Adresi (USDT)',
        loginBtn: 'Giriş / Kayıt',
        level: 'Risk Seviyesi Seç',
        low: 'Düşük',
        medium: 'Orta',
        high: 'Yüksek',
        bet: 'Bahis',
        play: 'Kutu Seç',
        deposit: 'Yatır',
        withdraw: 'Çek',
        leaders: 'Bugünün Liderleri',
        recent: 'Son İşlemler',
        logout: 'Çıkış Yap',
        win: 'Kazandın!',
        lose: 'Kaybettin!',
        multiplier: 'Çarpan',
        profit: 'Kâr'
    },
    fr: {
        title: 'Boîte Noire',
        balance: 'Solde',
        login: 'Connexion',
        email: 'E-mail',
        wallet: 'Adresse du portefeuille Binance (USDT)',
        loginBtn: 'Connexion / Inscription',
        level: 'Choisissez le niveau de risque',
        low: 'Bas',
        medium: 'Moyen',
        high: 'Élevé',
        bet: 'Mise',
        play: 'Choisissez une boîte',
        deposit: 'Dépôt',
        withdraw: 'Retrait',
        leaders: 'Les leaders du jour',
        recent: 'Transactions récentes',
        logout: 'Déconnexion',
        win: 'Vous gagnez!',
        lose: 'Vous perdez!',
        multiplier: 'Multiplicateur',
        profit: 'Bénéfice'
    }
};

let currentLang = 'ar';

function setLang(lang) {
    currentLang = lang;
    const t = langData[lang];
    document.querySelector('h1').textContent = t.title;
    document.getElementById('balance').textContent = `${t.balance}: 0.00 $`;
    document.querySelector('#login-section h2').textContent = t.login;
    document.querySelector('#emailInput').placeholder = t.email;
    document.querySelector('#walletInput').placeholder = t.wallet;
    document.querySelector('#login-section button').textContent = t.loginBtn;
    document.querySelector('#level-select label').textContent = t.level;
    document.querySelectorAll('.level-btn')[0].textContent = t.low;
    document.querySelectorAll('.level-btn')[1].textContent = t.medium;
    document.querySelectorAll('.level-btn')[2].textContent = t.high;
    document.getElementById('playBtn').textContent = t.play;
    document.querySelector('#action-buttons button:first-child').textContent = t.deposit;
    document.querySelector('#action-buttons button:last-child').textContent = t.withdraw;
    document.querySelector('#leaderboard h3:first-child').textContent = t.leaders;
    document.querySelector('#leaderboard h3:last-child').textContent = t.recent;
    document.getElementById('logoutBtn').textContent = t.logout;
}

// === دوال التسجيل والجلسة ===
function login() {
    const email = document.getElementById('emailInput').value.trim();
    const wallet = document.getElementById('walletInput').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!email || !wallet) {
        errorEl.textContent = 'الرجاء ملء جميع الحقول';
        errorEl.style.display = 'block';
        return;
    }

    // التحقق من صيغة البريد الإلكتروني
    if (!email.includes('@') || !email.includes('.')) {
        errorEl.textContent = 'البريد الإلكتروني غير صحيح';
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, wallet_address: wallet })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            errorEl.textContent = data.error;
            errorEl.style.display = 'block';
            return;
        }
        currentUser = { email, id: data.id };
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('game-section').style.display = 'block';
        updateBalance();
        fetchLeaderboard();
        fetchRecentTransactions();
        // تخزين في localStorage لاستمرار الجلسة
        localStorage.setItem('blackbox_user', JSON.stringify(currentUser));
    })
    .catch(err => {
        errorEl.textContent = 'خطأ في الاتصال بالخادم';
        errorEl.style.display = 'block';
    });
}

// استعادة الجلسة إذا كانت موجودة
window.onload = function() {
    const saved = localStorage.getItem('blackbox_user');
    if (saved) {
        try {
            const user = JSON.parse(saved);
            currentUser = user;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('game-section').style.display = 'block';
            updateBalance();
            fetchLeaderboard();
            fetchRecentTransactions();
            setLang('ar');
        } catch(e) {
            localStorage.removeItem('blackbox_user');
        }
    } else {
        setLang('ar');
    }
};

function logout() {
    currentUser = null;
    localStorage.removeItem('blackbox_user');
    document.getElementById('game-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('balance').textContent = 'رصيدك: 0.00 $';
    document.getElementById('boxes-container').innerHTML = '';
    document.getElementById('result-display').innerHTML = '';
}

// === تحديث الرصيد ===
function updateBalance() {
    if (!currentUser) return;
    fetch(`/api/balance?email=${encodeURIComponent(currentUser.email)}`)
        .then(res => res.json())
        .then(data => {
            if (data.balance !== undefined) {
                const t = langData[currentLang];
                document.getElementById('balance').textContent = `${t.balance}: ${data.balance.toFixed(2)} $`;
            }
        })
        .catch(err => console.error('خطأ في جلب الرصيد:', err));
}

// === اختيار المستوى ===
function setLevel(level) {
    currentLevel = level;
    const btns = document.querySelectorAll('.level-btn');
    btns.forEach(btn => {
        btn.className = 'level-btn';
        if (btn.dataset.level === level) {
            btn.classList.add(`active-${level}`);
        }
    });
    const t = langData[currentLang];
    const levelNames = { low: t.low, medium: t.medium, high: t.high };
    document.getElementById('current-level').textContent = `المستوى: ${levelNames[level]}`;
}

// === اللعبة ===
function playGame() {
    if (gameLocked) {
        return;
    }
    if (!currentUser) {
        alert('يرجى تسجيل الدخول أولاً');
        return;
    }

    const bet = parseFloat(document.getElementById('betAmount').value);
    if (isNaN(bet) || bet < 0.50) {
        alert('الحد الأدنى للرهان 0.50$');
        return;
    }

    // اختيار عشوائي للصندوق من قبل المستخدم (المستخدم يضغط على صندوق محدد)
    // لكننا سنحاكي اختياراً عشوائياً حالياً، وسنضبطه لاحقاً عند تفعيل الضغط على الصناديق
    const chosen_box = Math.floor(Math.random() * 4);

    gameLocked = true;
    document.getElementById('playBtn').disabled = true;
    document.getElementById('result-display').innerHTML = '⏳ جاري اللعب...';

    fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: currentUser.email,
            bet_amount: bet,
            level: currentLevel,
            chosen_box: chosen_box
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            document.getElementById('result-display').innerHTML = `❌ ${data.error}`;
            gameLocked = false;
            document.getElementById('playBtn').disabled = false;
            return;
        }

        // عرض الصناديق
        displayBoxes(data.boxes, chosen_box);
        const t = langData[currentLang];
        if (data.result === 'win') {
            document.getElementById('result-display').innerHTML = 
                `🎉 ${t.win} ${t.multiplier}: ${data.multiplier}x ، ${t.profit}: +${data.profit.toFixed(2)}$`;
            document.getElementById('result-display').className = 'result-win';
        } else {
            document.getElementById('result-display').innerHTML = 
                `💥 ${t.lose} ${t.profit}: ${data.profit.toFixed(2)}$`;
            document.getElementById('result-display').className = 'result-lose';
        }

        updateBalance();
        fetchLeaderboard();
        fetchRecentTransactions();

        gameLocked = false;
        document.getElementById('playBtn').disabled = false;
    })
    .catch(err => {
        document.getElementById('result-display').innerHTML = '❌ حدث خطأ في الاتصال';
        gameLocked = false;
        document.getElementById('playBtn').disabled = false;
    });
}

// === عرض الصناديق ===
function displayBoxes(boxes, chosen) {
    const container = document.getElementById('boxes-container');
    container.innerHTML = '';
    boxesData = boxes;

    boxes.forEach((box, index) => {
        const div = document.createElement('div');
        div.className = 'box';
        div.dataset.index = index;
        if (index === chosen) {
            // تم اختيار هذا الصندوق
            div.classList.add(box.type === 'win' ? 'reveal-win' : 'reveal-lose');
            div.textContent = box.type === 'win' ? `💰 ${box.multiplier}x` : '❌';
        } else {
            div.textContent = '📦';
            // إضافة حدث النقر لاختيار الصندوق (لتجربة تفاعلية أفضل)
            div.addEventListener('click', function() {
                if (!gameLocked && currentUser) {
                    // محاكاة اختيار الصندوق
                    const bet = parseFloat(document.getElementById('betAmount').value);
                    if (isNaN(bet) || bet < 0.50) {
                        alert('الحد الأدنى للرهان 0.50$');
                        return;
                    }
                    // إعادة تنفيذ اللعبة مع هذا الاختيار
                    executeGameWithChoice(parseInt(this.dataset.index));
                }
            });
        }
        container.appendChild(div);
    });
}

// === تنفيذ اللعبة مع اختيار محدد ===
function executeGameWithChoice(chosen) {
    if (gameLocked) return;
    if (!currentUser) return;

    const bet = parseFloat(document.getElementById('betAmount').value);
    if (isNaN(bet) || bet < 0.50) {
        alert('الحد الأدنى للرهان 0.50$');
        return;
    }

    gameLocked = true;
    document.getElementById('playBtn').disabled = true;
    document.getElementById('result-display').innerHTML = '⏳ جاري اللعب...';

    fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: currentUser.email,
            bet_amount: bet,
            level: currentLevel,
            chosen_box: chosen
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            document.getElementById('result-display').innerHTML = `❌ ${data.error}`;
            gameLocked = false;
            document.getElementById('playBtn').disabled = false;
            return;
        }

        displayBoxes(data.boxes, chosen);
        const t = langData[currentLang];
        if (data.result === 'win') {
            document.getElementById('result-display').innerHTML = 
                `🎉 ${t.win} ${t.multiplier}: ${data.multiplier}x ، ${t.profit}: +${data.profit.toFixed(2)}$`;
            document.getElementById('result-display').className = 'result-win';
        } else {
            document.getElementById('result-display').innerHTML = 
                `💥 ${t.lose} ${t.profit}: ${data.profit.toFixed(2)}$`;
            document.getElementById('result-display').className = 'result-lose';
        }

        updateBalance();
        fetchLeaderboard();
        fetchRecentTransactions();

        gameLocked = false;
        document.getElementById('playBtn').disabled = false;
    })
    .catch(err => {
        document.getElementById('result-display').innerHTML = '❌ حدث خطأ في الاتصال';
        gameLocked = false;
        document.getElementById('playBtn').disabled = false;
    });
}

// === لوحة المتصدرين ===
function fetchLeaderboard() {
    // هذه محاكاة لأننا لم ننشئ مسار leaderboard بعد
    // لكننا سنستخدم الإحصائيات الموجودة
    const leadersList = document.getElementById('leaders');
    leadersList.innerHTML = '<li>جاري التحميل...</li>';
    // سنقوم بجلبها من API لاحقاً
    fetch('/api/admin/stats?password=BlackBox@2026#Secure')
        .then(res => res.json())
        .then(data => {
            leadersList.innerHTML = `
                <li>👥 إجمالي المستخدمين: ${data.total_users || 0}</li>
                <li>💰 إجمالي الإيداعات: ${(data.total_deposits || 0).toFixed(2)}$</li>
                <li>💸 إجمالي السحوبات: ${(data.total_withdraws || 0).toFixed(2)}$</li>
                <li>📈 أرباح المنصة: ${(data.total_profit || 0).toFixed(2)}$</li>
            `;
        })
        .catch(() => {
            leadersList.innerHTML = '<li>لا توجد بيانات كافية</li>';
        });
}

// === آخر المعاملات ===
function fetchRecentTransactions() {
    const txList = document.getElementById('recent-tx');
    txList.innerHTML = '<li>جاري التحميل...</li>';
    // نستخدم نفس مسار الإحصائيات
    fetch('/api/admin/stats?password=BlackBox@2026#Secure')
        .then(res => res.json())
        .then(data => {
            txList.innerHTML = `
                <li>📥 إيداعات: ${(data.total_deposits || 0).toFixed(2)}$</li>
                <li>📤 سحوبات: ${(data.total_withdraws || 0).toFixed(2)}$</li>
                <li>🏆 أرباح اللاعبين: ${(data.total_profit || 0).toFixed(2)}$</li>
            `;
        })
        .catch(() => {
            txList.innerHTML = '<li>لا توجد معاملات حالياً</li>';
        });
}

// === الإيداع ===
function deposit() {
    if (!currentUser) {
        alert('يرجى تسجيل الدخول أولاً');
        return;
    }
    const amount = prompt('أدخل المبلغ الذي تريد إيداعه (بالدولار، الحد الأدنى 10$):');
    if (!amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
        alert('الحد الأدنى للإيداع 10$');
        return;
    }
    const txid = prompt('أدخل معرف المعاملة (TxID) من Binance:');
    if (!txid || txid.trim() === '') {
        alert('يجب إدخال TxID');
        return;
    }

    fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: currentUser.email,
            amount: numAmount,
            txid: txid.trim()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('تم استلام طلب الإيداع، سيتم مراجعته خلال 24 ساعة');
        }
    })
    .catch(err => {
        alert('حدث خطأ في الاتصال');
    });
}

// === طلب سحب ===
function requestWithdraw() {
    if (!currentUser) {
        alert('يرجى تسجيل الدخول أولاً');
        return;
    }
    const amount = prompt('أدخل المبلغ الذي تريد سحبه (بالدولار، الحد الأدنى 10$):');
    if (!amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
        alert('الحد الأدنى للسحب 10$');
        return;
    }

    fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: currentUser.email,
            amount: numAmount
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('تم تقديم طلب السحب، سيتم مراجعته خلال 48 ساعة');
            updateBalance();
        }
    })
    .catch(err => {
        alert('حدث خطأ في الاتصال');
    });
}

// === تحديث الرصيد كل 30 ثانية ===
setInterval(() => {
    if (currentUser) {
        updateBalance();
    }
}, 30000);
