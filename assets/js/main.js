/* ============================================================================
   main.js — Интерактив лендинга «Скидка за смартфон»
   ----------------------------------------------------------------------------
   Без зависимостей. Каждый модуль самостоятелен: если нужного узла нет
   в разметке, модуль просто не запускается и не ломает остальные.

   01. Тема (светлая / тёмная)
   02. Мобильное меню
   03. Шапка: тень при скролле + прогресс чтения
   04. Обратный отсчёт
   05. Аккордеон FAQ
   06. Табы точек продаж
   07. Калькулятор выгоды
   08. Переключатель языка
   09. Появление блоков при скролле
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* localStorage может бросать исключение в приватном режиме — оборачиваем */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* игнорируем */ } }
  };

  /* ========================================================================
     01. ТЕМА
     ====================================================================== */
  (function theme() {
    var toggle = $('#theme-toggle');
    if (!toggle) return;

    var root  = document.documentElement;
    var media = window.matchMedia('(prefers-color-scheme: dark)');

    function apply(mode, persist) {
      root.dataset.theme = mode;
      toggle.setAttribute('aria-label',
        mode === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      if (persist) store.set('mobiuz-theme', mode);
    }

    apply(root.dataset.theme || 'light', false);

    toggle.addEventListener('click', function () {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });

    /* Следуем за системой, пока пользователь не выбрал тему вручную */
    media.addEventListener('change', function (e) {
      if (!store.get('mobiuz-theme')) apply(e.matches ? 'dark' : 'light', false);
    });
  })();

  /* ========================================================================
     02. МОБИЛЬНОЕ МЕНЮ
     ====================================================================== */
  (function mobileNav() {
    var burger = $('#burger');
    var nav    = $('#nav');
    if (!burger || !nav) return;

    var iconMenu = $('.icon-menu', burger);

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      if (iconMenu) {
        iconMenu.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
      }
    }

    burger.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });

    /* Закрываем при переходе по якорю и по Esc */
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });

    /* На десктопе меню всегда развёрнуто — снимаем мобильный класс */
    window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });
  })();

  /* ========================================================================
     03. ШАПКА: ТЕНЬ + ПРОГРЕСС ЧТЕНИЯ
     ====================================================================== */
  (function headerState() {
    var header   = $('#header');
    var progress = $('#progress');
    if (!header) return;

    var ticking = false;

    function update() {
      var y = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('is-stuck', y > 8);

      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
      ticking = false;
    }

    /* rAF-троттлинг: не пересчитываем чаще одного кадра */
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    update();
  })();

  /* ========================================================================
     04. ОБРАТНЫЙ ОТСЧЁТ
     ====================================================================== */
  (function countdown() {
    var root = $('#countdown');
    if (!root) return;

    var deadline = new Date(root.dataset.deadline).getTime();
    if (isNaN(deadline)) return;

    var cells = {
      days:    $('[data-cd="days"]', root),
      hours:   $('[data-cd="hours"]', root),
      minutes: $('[data-cd="minutes"]', root),
      seconds: $('[data-cd="seconds"]', root)
    };

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };

    function tick() {
      var left = deadline - Date.now();

      if (left <= 0) {
        root.querySelector('.countdown__label').textContent = 'Акция завершена';
        Object.keys(cells).forEach(function (k) { if (cells[k]) cells[k].textContent = '00'; });
        clearInterval(timer);
        return;
      }

      var s = Math.floor(left / 1000);
      if (cells.days)    cells.days.textContent    = String(Math.floor(s / 86400));
      if (cells.hours)   cells.hours.textContent   = pad(Math.floor(s / 3600) % 24);
      if (cells.minutes) cells.minutes.textContent = pad(Math.floor(s / 60) % 60);
      if (cells.seconds) cells.seconds.textContent = pad(s % 60);
    }

    tick();
    var timer = setInterval(tick, 1000);
  })();

  /* ========================================================================
     05. АККОРДЕОН FAQ
     ====================================================================== */
  (function faq() {
    var buttons = $$('.faq__q');
    if (!buttons.length) return;

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq__item');
        var open = btn.getAttribute('aria-expanded') === 'true';

        /* Режим «аккордеон»: открыт только один пункт.
           Уберите этот блок, чтобы разрешить несколько открытых сразу. */
        if (!open) {
          buttons.forEach(function (other) {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
            other.closest('.faq__item').classList.remove('is-open');
          });
        }

        btn.setAttribute('aria-expanded', String(!open));
        item.classList.toggle('is-open', !open);
      });

      /* Навигация стрелками между вопросами — как в паттерне WAI-ARIA */
      btn.addEventListener('keydown', function (e) {
        var map = { ArrowDown: 1, ArrowUp: -1 };
        if (e.key in map) {
          e.preventDefault();
          buttons[(i + map[e.key] + buttons.length) % buttons.length].focus();
        } else if (e.key === 'Home') {
          e.preventDefault(); buttons[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault(); buttons[buttons.length - 1].focus();
        }
      });
    });
  })();

  /* ========================================================================
     06. ТАБЫ ТОЧЕК ПРОДАЖ
     ====================================================================== */
  (function tabs() {
    var list = $('[role="tablist"]');
    if (!list) return;

    var tabList = $$('[role="tab"]', list);

    function select(tab) {
      tabList.forEach(function (t) {
        var active = t === tab;
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
    }

    tabList.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });

      tab.addEventListener('keydown', function (e) {
        var map = { ArrowRight: 1, ArrowLeft: -1 };
        var next = null;

        if (e.key in map)      next = tabList[(i + map[e.key] + tabList.length) % tabList.length];
        else if (e.key === 'Home') next = tabList[0];
        else if (e.key === 'End')  next = tabList[tabList.length - 1];

        if (next) { e.preventDefault(); select(next); next.focus(); }
      });
    });
  })();

  /* ========================================================================
     07. КАЛЬКУЛЯТОР ВЫГОДЫ
     ====================================================================== */
  (function calculator() {
    var range = $('#calc-months');
    var total = $('#calc-total');
    if (!range || !total) return;

    var out   = $('#calc-months-out');
    var note  = $('#calc-note');
    var chips = $$('.chip[data-fee]');

    /* Неразрывный пробел как разделитель разрядов: 180 000 */
    var nf = new Intl.NumberFormat('ru-RU');
    var fee = 60000;

    /* Склонение слова «месяц»: 1 месяц / 2 месяца / 5 месяцев */
    function plural(n) {
      var n10 = n % 10, n100 = n % 100;
      if (n10 === 1 && n100 !== 11) return 'месяц';
      if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'месяца';
      return 'месяцев';
    }

    function render() {
      var months = Number(range.value);
      var sum    = months * fee;

      if (out) out.textContent = months;
      total.textContent = nf.format(sum) + ' сум';
      if (note) {
        note.textContent = months + ' ' + plural(months) + ' × ' +
                           nf.format(fee) + ' сум абонентской платы';
      }

      /* Закрашиваем пройденную часть дорожки слайдера */
      var pct = (months - range.min) / (range.max - range.min) * 100;
      range.style.background =
        'linear-gradient(90deg, var(--mts-red) 0 ' + pct + '%, var(--border-subtle) ' + pct + '% 100%)';
    }

    range.addEventListener('input', render);

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        fee = Number(chip.dataset.fee);
        render();
      });
    });

    render();
  })();

  /* ========================================================================
     08. ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА
     ======================================================================
     Демонстрационный: только визуальное состояние. В бою здесь должен быть
     переход на /uz/... или /ru/... */
  (function lang() {
    var buttons = $$('.lang__btn');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      });
    });
  })();

  /* ========================================================================
     09. ПОЯВЛЕНИЕ БЛОКОВ ПРИ СКРОЛЛЕ
     ====================================================================== */
  (function reveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    /* Нет IntersectionObserver или пользователь просит меньше движения —
       показываем всё сразу */
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target); /* анимируем один раз */
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

    items.forEach(function (el) { io.observe(el); });
  })();

})();
